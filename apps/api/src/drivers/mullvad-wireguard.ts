import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ActionResult, ChakanaConfig, GeoActionDriver, Relay } from "@chakana/shared";

const run = promisify(execFile);

const sh = async (cmd: string, args: string[]): Promise<string> => {
  const { stdout } = await run(cmd, args, { maxBuffer: 1024 * 1024 });
  return stdout.trim();
};

const defaultRouteValue = (stdout: string, field: number): string | undefined => {
  const line = stdout.split("\n").find((l) => l.startsWith("default"));
  return line?.split(/\s+/)[field];
};

const queryWireguard = async (
  cfg: ChakanaConfig,
  iface: string,
  sub: string[],
): Promise<string> => {
  try {
    return await sh(cfg.wireguard.wg_command, ["show", iface, ...sub]);
  } catch (err) {
    console.warn(`Could not query WireGuard interface ${iface}:`, err);
    return "";
  }
};

export interface RelayResolver {
  (hostname: string): Promise<Relay | undefined>;
}

export const createMullvadWireguardDriver = (
  cfg: ChakanaConfig,
  resolve: RelayResolver,
): GeoActionDriver => {
  return {
    id: "mullvad-wireguard",
    name: "Mullvad (WireGuard)",
    description: `Re-keys the ${cfg.wireguard.interface} interface to the selected relay`,
    async executeAction({ hostname }): Promise<ActionResult> {
      const relay = await resolve(hostname);
      if (!relay) return { success: false, message: `Unknown relay: ${hostname}` };
      return switchRelay(cfg, relay);
    },
  };
};

const switchRelay = async (cfg: ChakanaConfig, relay: Relay): Promise<ActionResult> => {
  const newPubKey = relay.public_key;
  const newEndpointIp = relay.ipv4_addr_in;
  const newEndpoint = `${newEndpointIp}:${cfg.wireguard.port}`;
  const iface = cfg.wireguard.interface;

  const oldPubKey = (await queryWireguard(cfg, iface, ["peers"])).split("\n")[0]?.trim();
  const endpointLine = await queryWireguard(cfg, iface, ["endpoints"]);
  const oldEndpointIp = endpointLine.split(/\s+/)[1]?.split(":")[0];

  const routeOut = await sh(cfg.wireguard.ip_command, ["route", "show", "default"]);
  const gateway = defaultRouteValue(routeOut, 2);
  const dev = defaultRouteValue(routeOut, 4);
  if (!gateway || !dev) throw new Error("Could not determine default route");

  if (oldEndpointIp) {
    try {
      await sh(cfg.wireguard.ip_command, ["route", "del", `${oldEndpointIp}/32`]);
    } catch (err) {
      console.warn(`Could not delete old route ${oldEndpointIp}/32:`, err);
    }
  }

  await sh(cfg.wireguard.ip_command, [
    "route",
    "replace",
    `${newEndpointIp}/32`,
    "via",
    gateway,
    "dev",
    dev,
  ]);

  if (oldPubKey) {
    await sh(cfg.wireguard.wg_command, ["set", iface, "peer", oldPubKey, "remove"]);
  }

  await sh(cfg.wireguard.wg_command, [
    "set",
    iface,
    "peer",
    newPubKey,
    "allowed-ips",
    cfg.wireguard.allowed_ips.join(","),
    "endpoint",
    newEndpoint,
    "persistent-keepalive",
    String(cfg.wireguard.persistent_keepalive),
  ]);

  return { success: true, message: `Switched ${iface} to ${relay.hostname} (${newEndpoint})` };
};
