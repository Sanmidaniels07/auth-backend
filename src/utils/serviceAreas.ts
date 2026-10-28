import { NIGERIA_LOCATIONS, findState } from "../data/nigeria-locations";

// Areas are a state's LGAs plus its well-known neighbourhoods ("Lekki",
// "Ikeja GRA"). Stores, delivery zones and buyers' addresses are matched to
// them so they can be counted per area: the public "Cakes in Lekki, Lagos"
// pages and each seller's customer map. Free text that matches no known
// area is never turned into a page.

const key = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// State name -> normalised area -> area name.
const AREAS = new Map<string, Map<string, string>>(
  NIGERIA_LOCATIONS.map((state) => {
    const index = new Map<string, string>();
    for (const area of [...(state.popularAreas ?? []), ...state.lgas]) {
      if (!index.has(key(area))) index.set(key(area), area);
    }
    return [state.name, index];
  })
);

/** Every known area of a state, A-Z. */
export const areasOf = (state: string) => [...(AREAS.get(state)?.values() ?? [])].sort((a, b) => a.localeCompare(b));

/** "lekki", "Lekki, Lagos" or "LEKKI" -> "Lekki" (for that state), or null. */
export const findArea = (state: string, input: string | null | undefined): string | null => {
  const index = AREAS.get(state);
  if (!index || !input) return null;
  return index.get(key(input)) ?? index.get(key(input.split(",")[0])) ?? null;
};

/** Where a person or store is: standard state name and known area (either may be null). */
export const locate = (place: { state?: string | null; city?: string | null }) => {
  const state = findState(place.state)?.name ?? null;
  return { state, area: state ? findArea(state, place.city) : null };
};

/**
 * A profile's free-text location ("Yaba, Lagos", "Abuja") -> state and
 * area. Tries each comma-separated part as the state.
 */
export const locateText = (text: string | null | undefined) => {
  const parts = (text ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const state = findState(parts[i])?.name;
    if (state) return { state, area: i > 0 ? findArea(state, parts[0]) : null };
  }
  return { state: null, area: null };
};

export interface CoverageStore {
  city: string | null;
  state: string | null;
  // Live delivery zones only (archived and pickup zones left out).
  shippingOptions: { areas: string[]; state: string | null }[];
}

/**
 * The areas a store serves, by state: where it's based plus every known
 * area its delivery zones list. Zones without a state use the store's.
 * Flat-rate zones with no areas don't count - they'd put every seller in
 * every area.
 */
export const storeCoverage = (store: CoverageStore) => {
  const coverage = new Map<string, Set<string>>();
  const add = (state: string | null, area: string | null) => {
    if (!state || !area) return;
    coverage.set(state, (coverage.get(state) ?? new Set()).add(area));
  };

  const home = locate(store);
  add(home.state, home.area);

  for (const zone of store.shippingOptions) {
    const state = findState(zone.state)?.name ?? home.state;
    if (!state) continue;
    for (const area of zone.areas) add(state, findArea(state, area));
  }
  return coverage;
};

export const servesArea = (store: CoverageStore, state: string, area: string) =>
  storeCoverage(store).get(state)?.has(area) ?? false;
