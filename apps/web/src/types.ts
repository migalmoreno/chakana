export type PeerStatus = "on" | "off" | "pending" | "error";

export enum PeerColor {
  On = "text-emerald-400",
  Off = "text-neutral-600",
  Pending = "text-amber-400",
  Error = "text-red-400",
}

export const PEER_TEXT: Record<PeerStatus, PeerColor> = {
  on: PeerColor.On,
  off: PeerColor.Off,
  pending: PeerColor.Pending,
  error: PeerColor.Error,
};
