export interface ChakanaConfig {
  server: {
    host: string;
    port: number;
  };
  map: {
    initial: {
      longitude: number;
      latitude: number;
      zoom: number;
    };
  };
  mullvad: {
    relays_url: string;
    cache_ttl_seconds: number;
  };
  wireguard: {
    interface: string;
    allowed_ips: string[];
    persistent_keepalive: number;
    port: number;
    ip_command: string;
    wg_command: string;
    up_command: string[];
    down_command: string[];
  };
  driver: {
    active: string;
  };
  allowed_countries: string[];
}
