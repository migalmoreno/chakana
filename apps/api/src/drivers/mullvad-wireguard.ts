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

const runLifecycle = async (argv: string[], label: string): Promise<ActionResult> => {
  const [cmd, ...args] = argv;
  if (!cmd) return { success: false, message: `No ${label} configured` };
  try {
    await sh(cmd, args);
    return { success: true, message: `${label} succeeded` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message: `${label} failed: ${message}` };
  }
};

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
    async disconnect(): Promise<ActionResult> {
      return disconnect(cfg);
    },
    async currentPeer(): Promise<string | null> {
      const iface = cfg.wireguard.interface;
      const peers = await queryWireguard(cfg, iface, ["peers"]);
      return peers.split("\n")[0]?.trim() || null;
    },
  };
};

const switchRelay = async (cfg: ChakanaConfig, relay: Relay): Promise<ActionResult> => {
  const newPubKey = relay.public_key;
  const newEndpointIp = relay.ipv4_addr_in;
  const newEndpoint = `${newEndpointIp}:${cfg.wireguard.port}`;
  const iface = cfg.wireguard.interface;

  const oldPubKey = (await queryWireguard(cfg, iface, ["peers"])).split("\n")[0]?.trim();

  if (!oldPubKey && cfg.wireguard.up_command.length) {
    const up = await runLifecycle(cfg.wireguard.up_command, "up_command");
    if (!up.success) return up;
  }

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

const disconnect = async (cfg: ChakanaConfig): Promise<ActionResult> => {
  const iface = cfg.wireguard.interface;

  if (cfg.wireguard.down_command.length) {
    const down = await runLifecycle(cfg.wireguard.down_command, "down_command");
    if (!down.success) return down;
    return { success: true, message: `Turned off ${iface}` };
  }

  const pubKey = (await queryWireguard(cfg, iface, ["peers"])).split("\n")[0]?.trim();
  if (!pubKey) return { success: true, message: `${iface} is already off` };

  const endpointLine = await queryWireguard(cfg, iface, ["endpoints"]);
  const endpointIp = endpointLine.split(/\s+/)[1]?.split(":")[0];

  await sh(cfg.wireguard.wg_command, ["set", iface, "peer", pubKey, "remove"]);

  if (endpointIp) {
    try {
      await sh(cfg.wireguard.ip_command, ["route", "del", `${endpointIp}/32`]);
    } catch (err) {
      console.warn(`Could not delete route ${endpointIp}/32:`, err);
    }
  }

  return { success: true, message: `Turned off ${iface}` };
};
