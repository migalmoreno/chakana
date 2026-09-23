import { useMemo, useState } from "react";
import type { Relay } from "@chakana/shared";

interface Props {
  relays: Relay[];
  selected: string | null;
  busy: boolean;
  iface: string;
  onSelect: (relay: Relay) => void;
}

export const Sidebar = ({ relays, selected, busy, iface, onSelect }: Props) => {
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
    <aside className="flex flex-col overflow-hidden border-r border-neutral-800 bg-neutral-900">
      <header className="border-b border-neutral-800 p-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-wide">
          <img src="/favicon.svg" className="size-6" alt="" aria-hidden="true" />
          Chakana
        </h1>
        <p className="mt-1 mb-3 font-mono text-xs text-neutral-400">{iface}</p>
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
