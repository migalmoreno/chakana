import { useState } from "react";
import { Marker, Popup } from "react-map-gl/maplibre";
import type { Relay } from "@chakana/shared";
import { PEER_TEXT, type PeerStatus } from "./types";

interface Props {
  city: {
    key: string;
    name: string;
    countryName: string;
    longitude: number;
    latitude: number;
    relays: Relay[];
  };
  selected: string | null;
  busy: boolean;
  peerStatus: PeerStatus;
  onSelect: (relay: Relay) => void;
}

export const CityMarker = ({ city, selected, busy, peerStatus, onSelect }: Props) => {
  const [open, setOpen] = useState(false);
  const containsSelected = city.relays.some((r) => r.hostname === selected);

  return (
    <>
      <Marker
        longitude={city.longitude}
        latitude={city.latitude}
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <button
          type="button"
          title={`${city.name}, ${city.countryName} (${city.relays.length} relays)`}
          className={[
            "size-3 rounded-full border-2 border-white shadow ring-1 ring-black/40 transition",
            containsSelected
              ? ["scale-125 bg-current ring-4 ring-current/40", PEER_TEXT[peerStatus]].join(" ")
              : "bg-blue-500 hover:scale-150",
          ].join(" ")}
        />
      </Marker>

      {open && (
        <Popup
          longitude={city.longitude}
          latitude={city.latitude}
          anchor="bottom"
          offset={12}
          closeButton
          onClose={() => setOpen(false)}
        >
          <div className="min-w-44">
            <div className="border-b border-neutral-800 px-3 py-2 text-xs font-medium">
              {city.name}, {city.countryName}
            </div>
            {city.relays.map((relay) => (
              <button
                key={relay.hostname}
                disabled={busy}
                onClick={() => onSelect(relay)}
                className={[
                  "block w-full px-3 py-1.5 text-left font-mono text-[11px] transition",
                  "hover:bg-blue-500/15 disabled:cursor-wait disabled:opacity-50",
                  selected === relay.hostname
                    ? "bg-blue-500/25 text-yellow-300"
                    : "text-neutral-300",
                ].join(" ")}
              >
                {relay.hostname}
              </button>
            ))}
          </div>
        </Popup>
      )}
    </>
  );
};
