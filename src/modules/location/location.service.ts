import { AppError } from "../../utils/appError";
import { NIGERIA_LOCATIONS, findState } from "../../data/nigeria-locations";

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

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const GEOCODE_TIMEOUT_MS = 8000;

// Turns browser coordinates into a Nigerian state using OpenStreetMap's
// free reverse geocoder (done server-side so requests carry an identifying
// User-Agent, as its usage policy requires). Only the state is used.
export const reverseGeocodeService = async (lat: number, lng: number) => {
  const url = `${NOMINATIM_URL}?format=jsonv2&zoom=10&addressdetails=1&lat=${lat}&lon=${lng}`;
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
      address?: { state?: string; city?: string; town?: string; county?: string; country_code?: string };
    };
    const address = data.address ?? {};

    if (address.country_code && address.country_code !== "ng") {
      throw new AppError("Your location appears to be outside Nigeria. Pick your state instead.", 422);
    }

    const state = findState(address.state);

    return {
      state: state?.name ?? null,
      city: address.city ?? address.town ?? address.county ?? null,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Couldn't detect your location right now. Pick your state instead.", 502);
  } finally {
    clearTimeout(timeout);
  }
};
