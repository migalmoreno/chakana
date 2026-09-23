import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { layersWithPartialCustomTheme } from "protomaps-themes-base";
import type { LayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import type { StyleSpecification } from "maplibre-gl";

export const PMTILES_URL: string = import.meta.env.VITE_PMTILES_URL ?? "/world.pmtiles";

let registered = false;

export const registerPmtiles = () => {
  if (registered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  registered = true;
};

export const basemapStyle = (
  theme: "light" | "dark" | "white" | "black" | "grayscale" = "dark",
): StyleSpecification => {
  const layers = layersWithPartialCustomTheme("protomaps", theme, {}, "en").map((layer) => {
    const l = layer as LayerSpecification & {
      layout?: Record<string, unknown>;
    };
    if (l.type === "symbol" && l.layout && l.layout["text-field"]) {
      return {
        ...l,
        layout: {
          ...l.layout,
          "text-field": ["case", ["has", "name:en"], ["get", "name:en"], ["get", "name"]],
        },
      };
    }
    return l;
  });

  return {
    version: 8,
    glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${PMTILES_URL}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> &middot; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
    },
    layers,
  } as StyleSpecification;
};
