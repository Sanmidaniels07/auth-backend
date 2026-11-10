import { DeliveryVehicle, ProductStatus, ShippingOptionType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { canCarry } from "../../utils/deliveryVehicle";
import { findState } from "../../data/nigeria-locations";
import { cityAreas, findArea, locateStore, placeLabel, resolvePlace } from "../../utils/serviceAreas";

// "Shop near you": products from sellers close to a buyer's area, city or
// state, closest first -
//   AREA      the seller is based in the buyer's area
//   DELIVERS  the seller has a delivery zone covering the buyer's area (or,
//             when shopping by city, any area of that city)
//   CITY      the seller is based elsewhere in the buyer's city
//   STATE     the seller is based elsewhere in the buyer's state
// Each product carries its cheapest delivery fee to the buyer's area when
// the seller has a zone there that can carry it.

export type NearbyTier = "AREA" | "DELIVERS" | "CITY" | "STATE";

export interface NearbyInput {
  state?: string;
  city?: string;
  area?: string;
  category?: string;
  page: number;
  limit: number;
}

interface Zone {
  areas: string[];
  state: string | null;
  fee: number;
  vehicle: DeliveryVehicle | null;
}

// A store's delivery zones that reach any of these areas of a state. Zones
// without a state use the store's own.
const zonesReaching = (zones: Zone[], homeState: string | null, state: string, areas: Set<string>) =>
  zones.filter((zone) => {
    const zoneState = findState(zone.state)?.name ?? homeState;
    return zoneState === state && zone.areas.some((area) => areas.has(findArea(state, area) ?? ""));
  });

const cheapestFee = (zones: Zone[], needed: DeliveryVehicle) => {
  const fees = zones
    .filter((zone) => canCarry({ type: ShippingOptionType.DELIVERY, vehicle: zone.vehicle }, needed))
    .map((zone) => zone.fee);
  return fees.length > 0 ? Math.min(...fees) : null;
};

export const getNearbyProductsService = async ({ state, city, area, category, page, limit }: NearbyInput) => {
  if (!state && !city && !area) {
    throw new AppError("Choose your area, city or state to find sellers near you.", 400);
  }

  const place = resolvePlace({ state, city, area });
  if (!place) {
    throw new AppError("We couldn't find that location. Try your area, city or state.", 404);
  }

  // The areas "near" means: the buyer's area, or every area of their city.
  const target = place.area ? new Set([place.area]) : place.city ? cityAreas(place.state, place.city) : null;
  const order: NearbyTier[] = place.area
    ? ["AREA", "DELIVERS", "CITY", "STATE"]
    : place.city
      ? ["CITY", "DELIVERS", "STATE"]
      : ["STATE"];
  const rank = (tier: NearbyTier) => order.indexOf(tier);

  const stores = await prisma.store.findMany({
    where: { isSuspended: false, products: { some: { status: ProductStatus.PUBLISHED } } },
    select: {
      id: true,
      city: true,
      state: true,
      shippingOptions: {
        where: { isArchived: false, type: ShippingOptionType.DELIVERY },
        select: { areas: true, state: true, fee: true, vehicle: true },
      },
    },
  });

  const matched = new Map<string, { tier: NearbyTier; zones: Zone[] }>();
  for (const store of stores) {
    const home = locateStore(store);
    const zones = target ? zonesReaching(store.shippingOptions, home?.state ?? null, place.state, target) : [];

    let tier: NearbyTier | null = null;
    if (home?.state === place.state) {
      if (place.area && home.area === place.area) tier = "AREA";
      else if (place.city && home.city === place.city) tier = "CITY";
      else tier = "STATE";
    }
    if (zones.length > 0 && (tier === null || rank("DELIVERS") < rank(tier))) tier = "DELIVERS";

    if (tier) matched.set(store.id, { tier, zones });
  }

  // Every matching product (ids only), closest sellers first, newest first within each group.
  const rows = await prisma.product.findMany({
    where: {
      status: ProductStatus.PUBLISHED,
      storeId: { in: [...matched.keys()] },
      ...(category ? { category: { slug: category } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, storeId: true },
  });
  const sorted = rows.sort((a, b) => rank(matched.get(a.storeId)!.tier) - rank(matched.get(b.storeId)!.tier));

  const tierCounts = Object.fromEntries(order.map((tier) => [tier, 0])) as Record<NearbyTier, number>;
  for (const row of sorted) tierCounts[matched.get(row.storeId)!.tier] += 1;

  const pageIds = sorted.slice((page - 1) * limit, page * limit).map((row) => row.id);
  const products = await prisma.product.findMany({
    where: { id: { in: pageIds } },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      store: { select: { id: true, name: true, slug: true, city: true, state: true } },
    },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  return {
    products: pageIds
      .map((id) => byId.get(id))
      .filter((product): product is NonNullable<typeof product> => !!product)
      .map((product) => {
        const match = matched.get(product.storeId)!;
        return {
          ...product,
          nearby: { tier: match.tier, deliveryFee: cheapestFee(match.zones, product.deliveryVehicle) },
        };
      }),
    total: sorted.length,
    page,
    limit,
    totalPages: Math.ceil(sorted.length / limit),
    location: { ...place, label: placeLabel(place) },
    tierCounts,
  };
};
