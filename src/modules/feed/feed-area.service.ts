import { ProductStatus, ShippingOptionType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { findState } from "../../data/nigeria-locations";
import { areasOf, findArea, locate, locateText, stateLabel, storeCoverage } from "../../utils/serviceAreas";

// "Near me" in the shopping feed: where the viewer is, and which stores
// serve there (based in the area, or delivering to it - the same coverage
// the "Cakes in Lekki, Lagos" pages use).

export type AreaSource = "CHOSEN" | "ADDRESS" | "PROFILE";

export interface FeedArea {
  state: string;
  // Null when only the state is known - then the whole state counts.
  area: string | null;
  label: string;
  source: AreaSource;
}

const labelOf = (state: string, area: string | null) => (area ? `${area}, ${stateLabel(state)}` : stateLabel(state));

/** The viewer's area: the one they picked, else their default address, else their profile location. */
export const resolveFeedArea = async (userId: string): Promise<FeedArea | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      feedState: true,
      feedArea: true,
      location: true,
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], take: 1, select: { state: true, city: true } },
    },
  });
  if (!user) return null;

  if (user.feedState) {
    return { state: user.feedState, area: user.feedArea, label: labelOf(user.feedState, user.feedArea), source: "CHOSEN" };
  }
  const address = user.addresses[0];
  if (address) {
    const place = locate({ state: address.state, city: address.city });
    if (place.state) return { state: place.state, area: place.area, label: labelOf(place.state, place.area), source: "ADDRESS" };
  }
  const fromProfile = locateText(user.location);
  if (fromProfile.state) {
    return { state: fromProfile.state, area: fromProfile.area, label: labelOf(fromProfile.state, fromProfile.area), source: "PROFILE" };
  }
  return null;
};

/** Saves the area "Near me" uses. A state alone means the whole state. */
export const setFeedAreaService = async (userId: string, input: { state: string; area?: string | null }) => {
  const state = findState(input.state)?.name;
  if (!state) throw new AppError("Choose a Nigerian state.", 400);
  const area = input.area ? findArea(state, input.area) : null;
  if (input.area && !area) throw new AppError(`We don't know "${input.area}" in ${stateLabel(state)} - pick one from the list.`, 400);
  await prisma.user.update({ where: { id: userId }, data: { feedState: state, feedArea: area } });
  return resolveFeedArea(userId);
};

/** The areas of a state, for the picker. */
export const feedAreaOptionsService = (stateInput: string) => {
  const state = findState(stateInput)?.name;
  if (!state) throw new AppError("Choose a Nigerian state.", 400);
  return { state, areas: areasOf(state) };
};

// Store coverage changes rarely; working it out means reading every live
// store, so it's kept for 10 minutes per area.
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; storeIds: string[] }>();

/** Live stores based in or delivering to the area (or anywhere in the state, when area is null). */
export const storesServing = async (state: string, area: string | null) => {
  const key = `${state}|${area ?? ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.storeIds;

  const stores = await prisma.store.findMany({
    where: { isSuspended: false, products: { some: { status: ProductStatus.PUBLISHED } } },
    select: {
      id: true,
      city: true,
      state: true,
      shippingOptions: { where: { isArchived: false, type: ShippingOptionType.DELIVERY }, select: { areas: true, state: true } },
    },
  });
  const storeIds = stores
    .filter((store) => {
      const served = storeCoverage(store).get(state);
      if (area) return served?.has(area) ?? false;
      // Whole state: any coverage there, or based there.
      return !!served?.size || locate(store).state === state;
    })
    .map((store) => store.id);

  cache.set(key, { at: Date.now(), storeIds });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return storeIds;
};
