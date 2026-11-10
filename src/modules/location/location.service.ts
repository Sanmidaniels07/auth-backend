import { ProductStatus, ShippingOptionType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { NIGERIA_LOCATIONS, findState, stateSpellings } from "../../data/nigeria-locations";
import {
  Place,
  areasOf,
  cityOfArea,
  citiesOf,
  findArea,
  findCity,
  locateStore,
  placeLabel,
  storeCoverage,
} from "../../utils/serviceAreas";

export const listStatesService = () =>
  NIGERIA_LOCATIONS.map((state) => ({
    name: state.name,
    lgaCount: state.lgas.length,
    hasSuggestedZones: !!state.suggestedZones?.length,
  }));

// Everything needed to suggest delivery zones for one state: ready-made
// zone groupings (big cities only) and a de-duplicated, sorted list of
// areas to build custom zones from (popular neighbourhoods + every LGA).
export const getStateLocationsService = (stateInput: string) => {
  const state = findState(stateInput);

  if (!state) {
    throw new AppError("Unknown state.", 404);
  }

  const areas = Array.from(new Set([...(state.popularAreas ?? []), ...state.lgas])).sort((a, b) =>
    a.localeCompare(b)
  );

  return {
    state: state.name,
    lgas: state.lgas,
    areas,
    suggestedZones: state.suggestedZones ?? [],
  };
};

// ---- Place search ("Shop near you") ---------------------------------------

type PlaceType = "area" | "city" | "state";

interface IndexedPlace extends Place {
  type: PlaceType;
  label: string;
  // Normalised names it can be found by (its name plus aliases / spellings).
  keys: string[];
}

const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Every state, city and area buyers can pick - built once. An area named
// like one of its state's cities ("Port Harcourt" LGA) is left to the city.
let placeIndex: IndexedPlace[] | null = null;
const getPlaceIndex = () => {
  if (placeIndex) return placeIndex;
  const places: IndexedPlace[] = [];
  for (const { name: state } of NIGERIA_LOCATIONS) {
    const statePlace = { state, city: null, area: null };
    places.push({ ...statePlace, type: "state", label: placeLabel(statePlace), keys: stateSpellings(state).map(norm) });

    for (const city of citiesOf(state)) {
      const cityPlace = { state, city: city.name, area: null };
      places.push({ ...cityPlace, type: "city", label: placeLabel(cityPlace), keys: city.keys.map(norm) });
    }
    for (const area of areasOf(state)) {
      if (findCity(state, area)) continue;
      const areaPlace = { state, city: cityOfArea(state, area), area };
      places.push({ ...areaPlace, type: "area", label: placeLabel(areaPlace), keys: [norm(area)] });
    }
  }
  placeIndex = places;
  return places;
};

// How many live stores serve each place, refreshed at most once a minute.
const COUNTS_TTL_MS = 60_000;
let countsCache: { at: number; counts: Map<string, number> } | null = null;
const placeKey = (place: Place) => [place.state, place.city ?? "", place.area ?? ""].join("|");

const getStoreCounts = async () => {
  if (countsCache && Date.now() - countsCache.at < COUNTS_TTL_MS) return countsCache.counts;

  const stores = await prisma.store.findMany({
    where: { isSuspended: false, products: { some: { status: ProductStatus.PUBLISHED } } },
    select: {
      city: true,
      state: true,
      shippingOptions: { where: { isArchived: false, type: ShippingOptionType.DELIVERY }, select: { areas: true, state: true } },
    },
  });

  const counts = new Map<string, number>();
  for (const store of stores) {
    // Each store counts once per place.
    const places = new Set<string>();
    const home = locateStore(store);
    if (home) {
      places.add(placeKey({ state: home.state, city: null, area: null }));
      if (home.city) places.add(placeKey({ state: home.state, city: home.city, area: null }));
    }
    for (const [state, areas] of storeCoverage(store)) {
      for (const area of areas) {
        const city = cityOfArea(state, area);
        places.add(placeKey({ state, city, area }));
        if (city) places.add(placeKey({ state, city, area: null }));
      }
    }
    for (const k of places) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  countsCache = { at: Date.now(), counts };
  return counts;
};

// Lower is better: exact name, then the name starts with it, then a word does, then it's inside.
const matchScore = (keys: string[], query: string) => {
  let best = Infinity;
  for (const k of keys) {
    if (k === query) best = Math.min(best, 0);
    else if (k.startsWith(query)) best = Math.min(best, 1);
    else if (k.split(" ").some((word) => word.startsWith(query))) best = Math.min(best, 2);
    else if (k.includes(query)) best = Math.min(best, 3);
  }
  return best;
};

const TYPE_ORDER: Record<PlaceType, number> = { city: 0, area: 1, state: 2 };

/**
 * Areas, cities and states matching what a buyer typed, with how many
 * sellers serve each - places with sellers first. With no query: the
 * places with the most sellers, as starting suggestions.
 */
export const searchPlacesService = async (query: string | undefined, limit: number) => {
  const counts = await getStoreCounts();
  const q = norm(query ?? "");

  return getPlaceIndex()
    .map((place) => ({ place, score: q ? matchScore(place.keys, q) : 0, storeCount: counts.get(placeKey(place)) ?? 0 }))
    .filter((entry) => (q ? entry.score < Infinity : entry.storeCount > 0 && entry.place.type !== "state"))
    .sort(
      (a, b) =>
        a.score - b.score ||
        Number(b.storeCount > 0) - Number(a.storeCount > 0) ||
        b.storeCount - a.storeCount ||
        TYPE_ORDER[a.place.type] - TYPE_ORDER[b.place.type] ||
        a.place.label.localeCompare(b.place.label)
    )
    .slice(0, limit)
    .map(({ place, storeCount }) => ({
      type: place.type,
      state: place.state,
      city: place.city,
      area: place.area,
      label: place.label,
      storeCount,
    }));
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const GEOCODE_TIMEOUT_MS = 8000;

// Turns browser coordinates into a Nigerian state using OpenStreetMap's
// free reverse geocoder (done server-side so requests carry an identifying
// User-Agent, as its usage policy requires). Returns the state, plus the
// known area and city when the neighbourhood is one we know.
export const reverseGeocodeService = async (lat: number, lng: number) => {
  const url = `${NOMINATIM_URL}?format=jsonv2&zoom=16&addressdetails=1&lat=${lat}&lon=${lng}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": `Nestly/1.0 (${process.env.FRONTEND_URL ?? "https://www.nestlyapp.site"})`,
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AppError("Couldn't detect your location right now. Pick your state instead.", 502);
    }

    const data = (await response.json()) as {
      address?: Record<string, string | undefined>;
    };
    const address = data.address ?? {};

    if (address.country_code && address.country_code !== "ng") {
      throw new AppError("Your location appears to be outside Nigeria. Pick your state instead.", 422);
    }

    const state = findState(address.state);
    if (!state) return { state: null, city: null, area: null, label: null };

    // Most specific first: neighbourhood, suburb... down to the LGA.
    const named = [address.neighbourhood, address.quarter, address.suburb, address.city_district, address.village, address.town, address.county, address.city];
    const found = named.map((name) => findArea(state.name, name)).find((name): name is string => !!name) ?? null;
    const city =
      (found ? findCity(state.name, found) : null) ??
      cityOfArea(state.name, found) ??
      [address.city, address.town, address.county].map((name) => findCity(state.name, name)).find((name): name is string => !!name) ??
      null;
    // An area that is really a city ("Port Harcourt" LGA) is shown as the city.
    const place = { state: state.name, city, area: found && findCity(state.name, found) ? null : found };

    return { ...place, label: placeLabel(place) };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Couldn't detect your location right now. Pick your state instead.", 502);
  } finally {
    clearTimeout(timeout);
  }
};
