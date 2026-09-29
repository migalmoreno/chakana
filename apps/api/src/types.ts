export interface SwitchRequest {
  hostname: string;
}

export interface PeerRequest {
  enabled: boolean;
  hostname?: string;
}

export interface PeerStatus {
  connected: boolean;
  driver: string;
  message?: string;
}
