import { useMemo, useState } from "react";
import type { Relay } from "@chakana/shared";
import { PEER_TEXT, type PeerStatus } from "./types";

interface Props {
  relays: Relay[];
  selected: string | null;
  busy: boolean;
  iface: string;
  peerOn: boolean;
  peerBusy: boolean;
  peerStatus: PeerStatus;
  peerName: string | null;
  onTogglePeer: (enabled: boolean) => void;
  onSelect: (relay: Relay) => void;
  onClose?: () => void;
}

export const Sidebar = ({
  relays,
  selected,
  busy,
  iface,
  peerOn,
  peerBusy,
  peerStatus,
  peerName,
  onTogglePeer,
  onSelect,
  onClose,
}: Props) => {
  const [query, setQuery] = useState("");

  const byCountry = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? relays.filter(
          (r) =>
            r.hostname.toLowerCase().includes(q) ||
            r.city_name.toLowerCase().includes(q) ||
            r.country_name.toLowerCase().includes(q),
        )
      : relays;
    const groups = new Map<string, Relay[]>();
    for (const relay of filtered) {
      const key = `${relay.country_name} (${relay.country_code})`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(relay);
      else groups.set(key, [relay]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [relays, query]);

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-neutral-800 bg-neutral-900">
      <header className="border-b border-neutral-800 p-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-wide">
          <img src="/favicon.svg" className="size-6" alt="" aria-hidden="true" />
          Chakana
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close relay list"
              className="ml-auto rounded-md p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 md:hidden"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeWidth="2" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </h1>
        <p className="mt-1 mb-3 font-mono text-xs text-neutral-400">{iface}</p>
        <button
          type="button"
          role="switch"
          aria-checked={peerOn}
          aria-label="Toggle Mullvad peer"
          disabled={peerBusy}
          onClick={() => onTogglePeer(!peerOn)}
          className="mb-3 flex w-full items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-left text-sm transition hover:border-neutral-700 disabled:cursor-wait disabled:opacity-50"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={["size-2.5 shrink-0 rounded-full bg-current", PEER_TEXT[peerStatus]].join(
                " ",
              )}
              aria-hidden="true"
            />
            <span
              className={[
                "truncate font-mono text-xs",
                peerOn ? "text-neutral-100" : "text-neutral-500",
              ].join(" ")}
            >
              {peerName ?? "No relay"}
            </span>
          </span>
          <span
            className={[
              "relative h-5 w-9 shrink-0 rounded-full transition",
              peerOn ? "bg-emerald-500" : "bg-neutral-700",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-0.5 size-4 rounded-full bg-white transition-all",
                peerOn ? "left-4.5" : "left-0.5",
              ].join(" ")}
            />
          </span>
        </button>
        <input
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-blue-600"
          placeholder="Search city, country, host…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      <div className="overflow-y-auto py-2">
        {byCountry.map(([country, list]) => (
          <section key={country}>
            <h2 className="mx-4 mt-3 mb-1 text-[11px] font-medium tracking-widest text-neutral-500 uppercase">
              {country}
            </h2>
            {list.map((relay) => (
              <button
                key={relay.hostname}
                disabled={busy}
                onClick={() => onSelect(relay)}
                className={[
                  "flex w-full items-center justify-between gap-2 px-4 py-1.5 text-left text-[13px] transition",
                  "hover:bg-blue-500/10 disabled:cursor-wait disabled:opacity-50",
                  selected === relay.hostname ? "bg-blue-500/25" : "",
                ].join(" ")}
              >
                <span>{relay.city_name}</span>
                <code className="text-[11px] text-neutral-400">{relay.hostname}</code>
              </button>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
};
