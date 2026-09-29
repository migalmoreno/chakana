import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { ChakanaConfig } from "@chakana/shared";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const defaults: ChakanaConfig = {
  server: { host: "0.0.0.0", port: 8080 },
  map: {
    initial: { longitude: 10, latitude: 30, zoom: 1.6 },
  },
  mullvad: {
    relays_url: "https://api.mullvad.net/public/relays/wireguard/v1/",
    cache_ttl_seconds: 3600,
  },
  wireguard: {
    interface: "mullvad0",
    allowed_ips: ["0.0.0.0/1", "128.0.0.0/1", "::/1", "8000::/1"],
    persistent_keepalive: 25,
    port: 51820,
    ip_command: "ip",
    wg_command: "wg",
    up_command: [],
    down_command: [],
  },
  driver: { active: "mullvad-wireguard" },
  allowed_countries: [],
};

let cached: ChakanaConfig | null = null;

export const configPath = (): string => {
  return process.env.CHAKANA_CONFIG
    ? resolve(process.cwd(), process.env.CHAKANA_CONFIG)
    : resolve(repoRoot, "apps/web/public/config.json");
};

export const loadConfig = async (force = false): Promise<ChakanaConfig> => {
  if (cached && !force) return cached;
  let user: Partial<ChakanaConfig> = {};
  try {
    user = JSON.parse(await readFile(configPath(), "utf8"));
  } catch (err) {
    console.warn(`Could not read config at ${configPath()}:`, err);
  }
  cached = {
    ...defaults,
    ...user,
    server: { ...defaults.server, ...user.server },
    map: {
      ...defaults.map,
      ...user.map,
      initial: { ...defaults.map.initial, ...user.map?.initial },
    },
    mullvad: { ...defaults.mullvad, ...user.mullvad },
    wireguard: { ...defaults.wireguard, ...user.wireguard },
    driver: { ...defaults.driver, ...user.driver },
    allowed_countries: user.allowed_countries ?? defaults.allowed_countries,
  };
  return cached;
};
