import { CITIES, NIGERIA_LOCATIONS, findState } from "../data/nigeria-locations";

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

// ---- Cities -----------------------------------------------------------

// State -> cities, with each city's areas resolved to the state's area names.
const CITY_INDEX = new Map(
  NIGERIA_LOCATIONS.map((state) => [
    state.name,
    (CITIES[state.name] ?? []).map((city) => ({
      name: city.name,
      keys: new Set([city.name, ...(city.aliases ?? [])].map(key)),
      areas: new Set(city.areas.map((area) => findArea(state.name, area)).filter((area): area is string => !!area)),
    })),
  ])
);

/** A state's cities: name, the normalised names it's known by, and the areas it covers. */
export const citiesOf = (state: string) =>
  (CITY_INDEX.get(state) ?? []).map((city) => ({ name: city.name, keys: [...city.keys], areas: [...city.areas] }));

/** "Port Harcourt", "PH" or "port-harcourt" -> "Port Harcourt" (in that state), or null. */
export const findCity = (state: string, input: string | null | undefined): string | null => {
  if (!input) return null;
  const wanted = key(input.split(",")[0]);
  return CITY_INDEX.get(state)?.find((city) => city.keys.has(wanted))?.name ?? null;
};

/** The city an area belongs to ("Bodija" -> "Ibadan"), or null. */
export const cityOfArea = (state: string, area: string | null | undefined): string | null =>
  area ? (CITY_INDEX.get(state)?.find((city) => city.areas.has(area))?.name ?? null) : null;

/** The areas a city covers (empty for an unknown city). */
export const cityAreas = (state: string, city: string) =>
  CITY_INDEX.get(state)?.find((c) => c.name === city)?.areas ?? new Set<string>();

export interface Place {
  state: string;
  city: string | null;
  area: string | null;
}

/**
 * Free text from a buyer (a picked suggestion, a saved address or their
 * phone's location) -> a known place. Any of the three may be missing: a
 * city or area without a state is looked up across every state ("Ibadan"
 * -> Oyo, "Festac" -> Lagos), taking the first match. A city name that is
 * really an area ("Ikeja") becomes the area. Null when nothing matches.
 */
export const resolvePlace = (input: { state?: string | null; city?: string | null; area?: string | null }): Place | null => {
  const states = input.state ? [findState(input.state)?.name].filter((s): s is string => !!s) : NIGERIA_LOCATIONS.map((s) => s.name);
  if (input.state && states.length === 0) return null;

  for (const state of states) {
    const area = findArea(state, input.area) ?? (findCity(state, input.city) ? null : findArea(state, input.city));
    const city = findCity(state, input.city) ?? findCity(state, input.area) ?? cityOfArea(state, area);
    if (input.state || area || city) return { state, city, area };
  }
  // "Abuja" / "Lagos" typed as the city: the whole state.
  const asState = findState(input.city) ?? findState(input.area);
  return asState ? { state: asState.name, city: null, area: null } : null;
};

/** What people call a state: "Abuja" rather than "Federal Capital Territory". */
export const stateLabel = (state: string) => (state === "Federal Capital Territory" ? "Abuja" : state);

/** "Bodija, Ibadan, Oyo" / "Festac, Lagos" / "Port Harcourt, Rivers" / "Lagos State" */
export const placeLabel = (place: Place) => {
  if (!place.area && !place.city) return place.state === "Federal Capital Territory" ? "Abuja (FCT)" : `${place.state} State`;
  // Skip the city when the area already names it ("GRA Port Harcourt").
  const city = place.city && !(place.area && key(place.area).includes(key(place.city))) ? place.city : null;
  const parts = [place.area, city, stateLabel(place.state)].filter((part): part is string => !!part);
  return parts.filter((part, i) => parts.findIndex((p) => key(p) === key(part)) === i).join(", ");
};

/** Where a store is based, with its city when known. */
export const locateStore = (store: { state?: string | null; city?: string | null }): Place | null => {
  const home = locate(store);
  if (!home.state) return null;
  return { state: home.state, area: home.area, city: findCity(home.state, store.city) ?? cityOfArea(home.state, home.area) };
};
