import type { ActionResult, Relay } from "@chakana/shared";

export interface AppConfig {
  map: {
    initial: { longitude: number; latitude: number; zoom: number };
  };
  driver: { active: string };
  allowed_countries: string[];
  wireguard: { interface: string };
}

export interface PeerStatusResponse {
  connected: boolean;
  driver: string;
  hostname: string | null;
  publicKey: string | null;
  message?: string;
}

const json = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
};

export const getConfig = () => fetch("/api/config").then(json<AppConfig>);
export const getRelays = () =>
  fetch("/api/relays").then(json<{ generated_at: string; relays: Relay[] }>);
export const getPeerStatus = () => fetch("/api/peer").then(json<PeerStatusResponse>);
export const setPeerEnabled = (enabled: boolean, hostname?: string) =>
  fetch("/api/peer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, hostname }),
  }).then(json<ActionResult>);
export const switchRelay = (hostname: string) =>
  fetch("/api/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostname }),
  }).then(json<ActionResult>);
