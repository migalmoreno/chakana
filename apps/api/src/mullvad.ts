import type { Relay, RelayCollection } from "@chakana/shared";

interface MullvadApi {
  countries: Array<{
    name: string;
    code: string;
    cities: Array<{
      name: string;
      code: string;
      latitude: number;
      longitude: number;
      relays: Array<{
        hostname: string;
        public_key: string;
        ipv4_addr_in: string;
        ipv6_addr_in?: string;
      }>;
    }>;
  }>;
}

let cache: { at: number; data: RelayCollection } | null = null;

export const fetchRelays = async (url: string, ttlSeconds: number): Promise<RelayCollection> => {
  const now = Date.now();
  if (cache && now - cache.at < ttlSeconds * 1000) return cache.data;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Mullvad API responded ${res.status}`);
  const json = (await res.json()) as MullvadApi;

  const relays: Relay[] = [];
  for (const country of json.countries ?? []) {
    for (const city of country.cities ?? []) {
      for (const relay of city.relays ?? []) {
        relays.push({
          hostname: relay.hostname,
          country_code: country.code,
          country_name: country.name,
          city_code: city.code,
          city_name: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
          public_key: relay.public_key,
          ipv4_addr_in: relay.ipv4_addr_in,
          ipv6_addr_in: relay.ipv6_addr_in,
        });
      }
    }
  }

  cache = { at: now, data: { generated_at: new Date(now).toISOString(), relays } };
  return cache.data;
};

export const findRelay = (collection: RelayCollection, hostname: string): Relay | undefined => {
  return collection.relays.find((r) => r.hostname === hostname);
};
