export interface Relay {
  hostname: string;
  country_code: string;
  country_name: string;
  city_code: string;
  city_name: string;
  latitude: number;
  longitude: number;
  public_key: string;
  ipv4_addr_in: string;
  ipv6_addr_in?: string;
}

export interface RelayCollection {
  generated_at: string;
  relays: Relay[];
}
