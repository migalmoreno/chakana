import { useEffect, useMemo, useState } from "react";
import MapView, { NavigationControl, type ViewStateChangeEvent } from "react-map-gl/maplibre";
import { Toaster, toast } from "sonner";
import type { Relay } from "@chakana/shared";
import { getConfig, getRelays, switchRelay, type AppConfig } from "./api";
import { basemapStyle, registerPmtiles } from "./basemap";
import { CityMarker } from "./CityMarker";
import { Sidebar } from "./Sidebar";

const style = basemapStyle("dark");

registerPmtiles();

export const App = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [relays, setRelays] = useState<Relay[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch((e) => setError(e.message));
    getRelays()
      .then((r) => setRelays(r.relays))
      .catch((e) => setError(e.message));
  }, []);

  const cities = useMemo(() => {
    const groups = new Map<string, Relay[]>();
    for (const relay of relays) {
      const key = `${relay.country_code}-${relay.city_code}`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(relay);
      else groups.set(key, [relay]);
    }
    return [...groups.entries()].map(([key, list]) => ({
      key,
      name: list[0].city_name,
      countryName: list[0].country_name,
      longitude: list[0].longitude,
      latitude: list[0].latitude,
      relays: list,
    }));
  }, [relays]);

  const onSelect = async (relay: Relay) => {
    setBusy(true);
    setSelected(relay.hostname);
    const toastId = toast.loading(`Switching to ${relay.hostname}…`);
    try {
      const result = await switchRelay(relay.hostname);
      toast[result.success ? "success" : "error"](result.message, { id: toastId });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message, { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  if (error)
    return (
      <div className="grid h-full place-items-center text-sm text-red-400">
        Failed to load: {error}
      </div>
    );
  if (!config)
    return <div className="grid h-full place-items-center text-sm text-neutral-400">Loading…</div>;

  return (
    <div className="grid h-full grid-cols-[320px_1fr]">
      <Sidebar
        relays={relays}
        selected={selected}
        busy={busy}
        iface={config.wireguard.interface}
        onSelect={onSelect}
      />
      <div className="relative">
        <MapView
          initialViewState={config.map.initial as ViewStateChangeEvent["viewState"]}
          mapStyle={style}
        >
          <NavigationControl position="top-right" />
          {cities.map((city) => (
            <CityMarker
              key={city.key}
              city={city}
              selected={selected}
              busy={busy}
              onSelect={onSelect}
            />
          ))}
        </MapView>
      </div>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
};
