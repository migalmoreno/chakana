import { useEffect, useMemo, useState } from "react";
import MapView, { NavigationControl, type ViewStateChangeEvent } from "react-map-gl/maplibre";
import { Toaster, toast } from "sonner";
import type { Relay } from "@chakana/shared";
import {
  getConfig,
  getPeerStatus,
  getRelays,
  setPeerEnabled,
  switchRelay,
  type AppConfig,
} from "./api";
import { basemapStyle, registerPmtiles } from "./basemap";
import { CityMarker } from "./CityMarker";
import { Sidebar } from "./Sidebar";
import { useConfigStore } from "./store";
import type { PeerStatus } from "./types";

const style = basemapStyle("dark");

registerPmtiles();

export const App = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [relays, setRelays] = useState<Relay[]>([]);
  const [busy, setBusy] = useState(false);
  const [peerBusy, setPeerBusy] = useState(false);
  const [peerStatus, setPeerStatus] = useState<PeerStatus>("off");
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeDriver = useConfigStore((s) => s.driver.active);
  const driverConfig = useConfigStore((s) => s.drivers[s.driver.active]);
  const setEnabled = useConfigStore((s) => s.setEnabled);
  const setHostname = useConfigStore((s) => s.setHostname);

  const selected = driverConfig?.hostname ?? null;
  const peerOn = driverConfig?.enabled ?? false;

  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch((e) => setError(e.message));
    getRelays()
      .then((r) => setRelays(r.relays))
      .catch((e) => setError(e.message));
    getPeerStatus()
      .then((s) => {
        setEnabled(activeDriver, s.connected);
        setPeerStatus(s.connected ? "on" : "off");
      })
      .catch(() => setPeerStatus("error"));
  }, [activeDriver, setEnabled]);

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
    setHostname(activeDriver, relay.hostname);
    setDrawerOpen(false);
    if (!peerOn) return;

    setBusy(true);
    setPeerStatus("pending");
    const toastId = toast.loading(`Switching to ${relay.hostname}…`);
    try {
      const result = await switchRelay(relay.hostname);
      toast[result.success ? "success" : "error"](result.message, { id: toastId });
      setPeerStatus(result.success ? "on" : "error");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message, { id: toastId });
      setPeerStatus("error");
    } finally {
      setBusy(false);
    }
  };

  const onTogglePeer = async (enabled: boolean) => {
    if (enabled && !selected) {
      toast.error("Select a relay first");
      return;
    }
    setPeerBusy(true);
    setPeerStatus("pending");
    const toastId = toast.loading(enabled ? "Turning on Mullvad…" : "Turning off Mullvad…");
    try {
      const result = await setPeerEnabled(enabled, enabled ? (selected ?? undefined) : undefined);
      toast[result.success ? "success" : "error"](result.message, { id: toastId });
      if (result.success) {
        setEnabled(activeDriver, enabled);
        setPeerStatus(enabled ? "on" : "off");
      } else {
        setPeerStatus("error");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message, { id: toastId });
      setPeerStatus("error");
    } finally {
      setPeerBusy(false);
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

  const sidebarProps = {
    relays,
    selected,
    busy,
    iface: config.wireguard.interface,
    peerOn,
    peerBusy,
    peerStatus,
    peerName: selected,
    onTogglePeer,
    onSelect,
  };

  return (
    <div className="relative h-full md:grid md:grid-cols-[320px_1fr]">
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close relay list"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
        />
      )}

      <div
        className={[
          "fixed inset-x-0 bottom-0 z-30 h-[75vh] overflow-hidden transition-transform duration-300",
          "md:static md:h-full md:translate-y-0",
          drawerOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        <Sidebar {...sidebarProps} onClose={() => setDrawerOpen(false)} />
      </div>

      <div className="absolute inset-0 md:relative">
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
              peerStatus={peerStatus}
              onSelect={onSelect}
            />
          ))}
        </MapView>
      </div>

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-neutral-700 bg-neutral-900/95 px-5 py-2.5 text-sm font-medium text-neutral-100 shadow-lg backdrop-blur md:hidden"
      >
        Relays
      </button>

      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
};
