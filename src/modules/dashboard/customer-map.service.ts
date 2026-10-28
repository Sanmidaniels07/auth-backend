import { OrderStatus, ShippingOptionType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { findState } from "../../data/nigeria-locations";
import { getSellerStore } from "../seller/seller.utils";
import { locate, locateText, storeCoverage } from "../../utils/serviceAreas";

type Place = { state: string | null; area: string | null };

/** Whether the store delivers to a place: "all" of a state, "some" of it, or "none". */
const deliveryCheck = (store: { city: string | null; state: string | null }, zones: { areas: string[]; state: string | null }[]) => {
  const coverage = storeCoverage({ ...store, shippingOptions: zones });
  // A delivery zone with no areas is a flat rate: its whole state, or anywhere.
  const flat = zones.filter((zone) => zone.areas.length === 0);
  const nationwide = flat.some((zone) => !findState(zone.state));
  const wholeStates = new Set(flat.map((zone) => findState(zone.state)?.name).filter(Boolean));

  return {
    coverage,
    state: (state: string): "all" | "some" | "none" =>
      nationwide || wholeStates.has(state) ? "all" : coverage.has(state) ? "some" : "none",
    area: (state: string, area: string) => nationwide || wholeStates.has(state) || (coverage.get(state)?.has(area) ?? false),
  };
};

type Delivery = ReturnType<typeof deliveryCheck>;

/**
 * Counts places per state and known area. Places with a state but an
 * unknown area count towards the state only ("elsewhere in Lagos");
 * places without a state count as unknown. Areas the store delivers to are
 * listed even with nobody there yet.
 */
const tally = (places: Place[], delivery: Delivery) => {
  const states = new Map<string, { count: number; areas: Map<string, number> }>();
  let unknown = 0;

  for (const place of places) {
    if (!place.state) {
      unknown += 1;
      continue;
    }
    const entry = states.get(place.state) ?? { count: 0, areas: new Map() };
    entry.count += 1;
    if (place.area) entry.areas.set(place.area, (entry.areas.get(place.area) ?? 0) + 1);
    states.set(place.state, entry);
  }

  for (const [state, areas] of delivery.coverage) {
    const entry = states.get(state) ?? { count: 0, areas: new Map() };
    for (const area of areas) if (!entry.areas.has(area)) entry.areas.set(area, 0);
    states.set(state, entry);
  }

  return {
    total: places.length,
    unknown,
    states: Array.from(states, ([state, entry]) => {
      const inAreas = [...entry.areas.values()].reduce((sum, count) => sum + count, 0);
      return {
        state,
        count: entry.count,
        delivers: delivery.state(state),
        otherAreas: entry.count - inAreas,
        areas: Array.from(entry.areas, ([area, count]) => ({
          area,
          count,
          delivers: delivery.area(state, area),
          // Named in a delivery zone or home: the store shows on that area's public pages.
          listed: delivery.coverage.get(state)?.has(area) ?? false,
        })).sort(
          (a, b) => b.count - a.count || a.area.localeCompare(b.area)
        ),
      };
    }).sort((a, b) => b.count - a.count || a.state.localeCompare(b.state)),
  };
};

/**
 * Where a store's customers are, for the seller's map. Orders: paid orders
 * in the period, by delivery address. Interested shoppers: signed-in people
 * who followed the store, visited it, viewed or saved its products in the
 * period, by their default address (or profile location). Counts only -
 * never names or addresses.
 */
export const getCustomerMapService = async (userId: string, days: number) => {
  const store = await getSellerStore(userId);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const [items, follows, storeViews, productViews, saves, zones] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        product: { storeId: store.id },
        // Same orders as the Customers list: paid, never sold-out cancellations.
        order: { status: { not: OrderStatus.PENDING }, cancelReason: null, createdAt: { gte: since } },
      },
      select: { orderId: true, order: { select: { address: { select: { city: true, state: true } } } } },
    }),
    prisma.storeFollow.findMany({ where: { storeId: store.id, createdAt: { gte: since } }, select: { userId: true } }),
    prisma.storeView.findMany({
      where: { storeId: store.id, viewedAt: { gte: since }, viewerId: { not: null } },
      select: { viewerId: true },
      distinct: ["viewerId"],
    }),
    prisma.recentlyViewed.findMany({
      where: { product: { storeId: store.id }, viewedAt: { gte: since } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.wishlist.findMany({
      where: { product: { storeId: store.id }, createdAt: { gte: since } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.shippingOption.findMany({
      where: { storeId: store.id, isArchived: false, type: ShippingOptionType.DELIVERY },
      select: { areas: true, state: true },
    }),
  ]);

  // One place per order (an order can have several of the store's items).
  const orders = new Map<string, Place>();
  for (const item of items) orders.set(item.orderId, locate(item.order.address));

  // One place per person; the seller's own visits don't count.
  const interestedIds = new Set(
    [...follows.map((f) => f.userId), ...storeViews.map((v) => v.viewerId), ...productViews.map((v) => v.userId), ...saves.map((s) => s.userId)].filter(
      (id): id is string => !!id && id !== userId
    )
  );
  const people = await prisma.user.findMany({
    where: { id: { in: [...interestedIds] } },
    select: {
      location: true,
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], take: 1, select: { city: true, state: true } },
    },
  });
  const interested = people.map((person): Place => {
    const fromAddress = person.addresses[0] ? locate(person.addresses[0]) : null;
    return fromAddress?.state ? fromAddress : locateText(person.location);
  });

  const delivery = deliveryCheck(store, zones);
  return {
    days,
    orders: tally([...orders.values()], delivery),
    interested: tally(interested, delivery),
  };
};
