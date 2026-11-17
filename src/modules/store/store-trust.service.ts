import {
  OrderEventActor,
  OrderEventType,
  OrderItemStatus,
  OrderStatus,
  ReturnRequestStatus,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

// A seller's public trust record: what they've actually done on Nestly,
// from real orders - not what they say about themselves. Shown on their
// store page, their payment links and a short shareable page
// (nestlyapp.site/s/{slug}) sellers put in their Instagram or WhatsApp bio.
// It can't be copied to another app: it only exists because the orders
// went through Nestly.

const PAID: OrderStatus[] = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

// Below these, a rate says more about luck than the seller - shown as "new".
const MIN_FOR_RATES = 5;
const SHIP_TIME_SAMPLE = 50;

export type TrustLevel = "TRUSTED" | "ESTABLISHED" | "NEW";

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: Awaited<ReturnType<typeof computeTrust>> }>();

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const computeTrust = async (store: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  city: string | null;
  state: string | null;
  isVerified: boolean;
  underReview: boolean;
  createdAt: Date;
}) => {
  const storeItem = { product: { storeId: store.id } };

  const [deliveredItems, deliveredOrders, sellerCancelled, shipped, returns, refunded, reviews, followers] = await Promise.all([
    // Items delivered and confirmed (by code, by the buyer, or automatically).
    prisma.orderItem.count({
      where: { ...storeItem, status: OrderItemStatus.DELIVERED, deliveryConfirmedAt: { not: null }, order: { status: { in: PAID } } },
    }),
    prisma.order.count({
      where: {
        status: { in: PAID },
        items: { some: { ...storeItem, status: OrderItemStatus.DELIVERED, deliveryConfirmedAt: { not: null } } },
      },
    }),
    // Items the seller cancelled themselves (not the buyer, not Nestly).
    prisma.orderEvent.count({
      where: { type: OrderEventType.CANCELLED, actor: OrderEventActor.SELLER, orderItem: storeItem },
    }),
    // Recent shipments - how long from order to sent out.
    prisma.orderItem.findMany({
      where: { ...storeItem, shippedAt: { not: null }, order: { status: { in: PAID } } },
      select: { shippedAt: true, order: { select: { createdAt: true } } },
      orderBy: { shippedAt: "desc" },
      take: SHIP_TIME_SAMPLE,
    }),
    prisma.returnRequest.count({ where: { orderItem: storeItem } }),
    prisma.returnRequest.count({ where: { orderItem: storeItem, status: ReturnRequestStatus.REFUNDED } }),
    prisma.review.aggregate({ where: { storeId: store.id }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.storeFollow.count({ where: { storeId: store.id } }),
  ]);

  const finished = deliveredItems + sellerCancelled;
  const completionRate = finished >= MIN_FOR_RATES ? Math.round((deliveredItems / finished) * 1000) / 10 : null;
  const refundRate = deliveredItems >= MIN_FOR_RATES ? Math.round((refunded / deliveredItems) * 1000) / 10 : null;
  const shipHours = median(
    shipped
      .filter((item) => item.shippedAt)
      .map((item) => Math.max(0, (item.shippedAt!.getTime() - item.order.createdAt.getTime()) / 3_600_000))
  );
  const rating = reviews._count._all ? Math.round((reviews._avg.rating ?? 0) * 10) / 10 : null;

  // Trusted: a verified business with a real track record and few problems.
  const level: TrustLevel =
    store.isVerified &&
    deliveredOrders >= 20 &&
    (completionRate ?? 0) >= 95 &&
    (refundRate ?? 100) <= 5 &&
    !store.underReview
      ? "TRUSTED"
      : deliveredOrders >= MIN_FOR_RATES && !store.underReview
        ? "ESTABLISHED"
        : "NEW";

  return {
    store: {
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      city: store.city,
      state: store.state,
    },
    level,
    // CAC-registered and checked (automatically or by an admin).
    verifiedBusiness: store.isVerified,
    // Started recently with quick start - Nestly hasn't reviewed it yet.
    newlyReviewed: !store.underReview,
    sellingSince: store.createdAt,
    deliveredOrders,
    // % of finished items that were delivered rather than cancelled by the seller.
    completionRate,
    // Typical hours from order to sent out (median of the last 50).
    typicalShipHours: shipHours === null ? null : Math.round(shipHours * 10) / 10,
    // % of delivered items refunded after a problem report.
    refundRate,
    problemReports: returns,
    rating,
    reviewCount: reviews._count._all,
    followers,
    updatedAt: new Date(),
  };
};

/** Public. 404 for suspended stores. Cached for 10 minutes per store. */
export const getStoreTrustService = async (slug: string) => {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      city: true,
      state: true,
      isVerified: true,
      isSuspended: true,
      underReview: true,
      createdAt: true,
    },
  });
  if (!store || store.isSuspended) throw new AppError("Store not found.", 404);

  const value = await computeTrust(store);
  cache.set(slug, { at: Date.now(), value });
  // Keep the cache small - it's a convenience, not a store.
  if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
  return value;
};
