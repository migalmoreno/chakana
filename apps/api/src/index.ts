import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig } from "./config.js";
import { fetchRelays, findRelay } from "./mullvad.js";
import { createMullvadWireguardDriver } from "./drivers/mullvad-wireguard.js";
import type { GeoActionDriver } from "@chakana/shared";

const config = await loadConfig();

const resolveRelay = async (hostname: string) => {
  const collection = await fetchRelays(config.mullvad.relays_url, config.mullvad.cache_ttl_seconds);
  return findRelay(collection, hostname);
};

const drivers: Record<string, GeoActionDriver> = {
  "mullvad-wireguard": createMullvadWireguardDriver(config, resolveRelay),
};

const app = new Hono();

app.use("*", cors());

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/config", (c) =>
  c.json({
    map: config.map,
    driver: config.driver,
    allowed_countries: config.allowed_countries,
    wireguard: {
      interface: config.wireguard.interface,
    },
  }),
);

app.get("/api/relays", async (c) => {
  const collection = await fetchRelays(config.mullvad.relays_url, config.mullvad.cache_ttl_seconds);
  const allowed = config.allowed_countries;
  const relays = allowed.length
    ? collection.relays.filter((r) => allowed.includes(r.country_code))
    : collection.relays;
  return c.json({ generated_at: collection.generated_at, relays });
});

app.post("/api/switch", async (c) => {
  const body = await c.req.json<{ hostname?: string }>().catch(() => null);
  const hostname = body?.hostname;
  if (!hostname) return c.json({ success: false, message: "hostname is required" }, 400);

  const driver = drivers[config.driver.active];
  if (!driver)
    return c.json({ success: false, message: `No active driver: ${config.driver.active}` }, 500);

  const collection = await fetchRelays(config.mullvad.relays_url, config.mullvad.cache_ttl_seconds);
  const relay = findRelay(collection, hostname);
  if (!relay) return c.json({ success: false, message: `Unknown relay: ${hostname}` }, 404);

  try {
    const result = await driver.executeAction({
      hostname: relay.hostname,
      countryCode: relay.country_code,
      countryName: relay.country_name,
    });
    return c.json(result, result.success ? 200 : 502);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, message }, 500);
  }
});

app.get("/api/status", async (c) => {
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const out = await promisify(execFile)(config.wireguard.wg_command, [
      "show",
      config.wireguard.interface,
      "endpoints",
    ]);
    return c.json({
      interface: config.wireguard.interface,
      endpoints: out.stdout.trim(),
    });
  } catch {
    return c.json({ interface: config.wireguard.interface, endpoints: null });
  }
});

serve({ fetch: app.fetch, hostname: config.server.host, port: config.server.port }, (info) => {
  console.log(`chakana api listening on http://${config.server.host}:${info.port}`);
  console.log(`active driver: ${config.driver.active}`);
});
