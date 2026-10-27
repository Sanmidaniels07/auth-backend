import { OrderItemStatus, OrderStatus, Prisma, ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

// Trending, best sellers and "For you" on the marketplace home, built from
// what buyers do: orders, saves, cart adds and product views.

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

const PAID_ORDER_STATUSES = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

// Fewer than this many results in the short window and we look further back,
// so a quiet week doesn't leave the section empty.
const MIN_RESULTS = 4;

// Views older than this are dropped (only recent ones are used).
const VIEW_RETENTION_DAYS = 90;

const LIVE_PRODUCT: Prisma.ProductWhereInput = {
  status: ProductStatus.PUBLISHED,
  store: { isSuspended: false },
};

const CARD_INCLUDE = {
  images: { where: { isPrimary: true }, take: 1 },
  category: { select: { id: true, name: true, slug: true } },
  store: { select: { id: true, name: true, slug: true, city: true, state: true } },
} satisfies Prisma.ProductInclude;

type CardProduct = Prisma.ProductGetPayload<{ include: typeof CARD_INCLUDE }>;

// Public lists change slowly and each query to the production database is a
// long round trip, so they're kept for a few minutes.
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

const cached = async <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
};

/** Live products by id, in the order of `ids`. */
const loadProducts = async (ids: string[], extraWhere: Prisma.ProductWhereInput = {}) => {
  if (!ids.length) return [];
  const products = await prisma.product.findMany({
    where: { AND: [LIVE_PRODUCT, extraWhere, { id: { in: ids } }] },
    include: CARD_INCLUDE,
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids.map((id) => byId.get(id)).filter((product): product is CardProduct => !!product);
};

const addScores = (scores: Map<string, number>, rows: { productId: string; _count: { _all: number } }[], weight: number) => {
  for (const row of rows) {
    scores.set(row.productId, (scores.get(row.productId) ?? 0) + row._count._all * weight);
  }
};

/**
 * How much buyer interest each product got since `since`. An order counts
 * most, then a save, a cart add and a view (each person's view once).
 */
const interestScores = async (since: Date) => {
  const [ordered, saved, carted, viewed] = await Promise.all([
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { status: { not: OrderItemStatus.CANCELLED }, order: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: since } } },
      _count: { _all: true },
    }),
    prisma.wishlist.groupBy({ by: ["productId"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.cartItem.groupBy({ by: ["productId"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.recentlyViewed.groupBy({ by: ["productId"], where: { viewedAt: { gte: since } }, _count: { _all: true } }),
  ]);

  const scores = new Map<string, number>();
  addScores(scores, ordered, 5);
  addScores(scores, saved, 3);
  addScores(scores, carted, 2);
  addScores(scores, viewed, 1);
  return scores;
};

const topIds = (scores: Map<string, number>, count: number) =>
  [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, count).map(([id]) => id);

const trendingIds = async (limit: number) => {
  // This fortnight first; the last three months if that's too quiet.
  for (const days of [14, 90]) {
    const scores = await interestScores(daysAgo(days));
    if (scores.size >= MIN_RESULTS || days === 90) return { scores, ids: topIds(scores, limit * 3) };
  }
  return { scores: new Map<string, number>(), ids: [] };
};

export const getTrendingProductsService = (limit: number) =>
  cached(`trending:${limit}`, async () => {
    const { ids } = await trendingIds(limit);
    return (await loadProducts(ids)).slice(0, limit);
  });

/** Units sold per product on paid orders since `since` (cancelled items left out). */
const unitsSold = async (since: Date | undefined, category?: string) => {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      status: { not: OrderItemStatus.CANCELLED },
      order: { status: { in: PAID_ORDER_STATUSES }, ...(since ? { createdAt: { gte: since } } : {}) },
      ...(category ? { product: { category: { slug: category } } } : {}),
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 100,
  });
  return rows.map((row) => ({ productId: row.productId, sold: row._sum.quantity ?? 0 }));
};

export const getBestSellersService = (limit: number, category?: string) =>
  cached(`best:${limit}:${category ?? ""}`, async () => {
    // The last three months; all time if there aren't enough yet.
    let rows = await unitsSold(daysAgo(90), category);
    if (rows.length < MIN_RESULTS) rows = await unitsSold(undefined, category);

    const sold = new Map(rows.map((row) => [row.productId, row.sold]));
    const products = await loadProducts(rows.map((row) => row.productId));
    return products.slice(0, limit).map((product) => ({ ...product, soldCount: sold.get(product.id) ?? 0 }));
  });

type Reason = "FOLLOWED_STORE" | "SIMILAR" | "POPULAR" | "NEW";

/**
 * Products picked for one buyer: from stores they follow or have shopped
 * at, and in categories they've viewed, saved, carted or bought - with
 * popular and new ones mixed in. Their own products, things they've
 * already bought and what's in their cart are left out. Each comes with a `reason`.
 */
export const getForYouService = async (userId: string, limit: number) => {
  const since = daysAgo(60);
  const product = { select: { id: true, categoryId: true, storeId: true } };

  const [viewed, saved, carted, bought, follows, ownStore] = await Promise.all([
    prisma.recentlyViewed.findMany({ where: { userId, viewedAt: { gte: since } }, orderBy: { viewedAt: "desc" }, take: 60, select: { product } }),
    prisma.wishlist.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 40, select: { product } }),
    prisma.cartItem.findMany({ where: { cart: { userId } }, take: 40, select: { product } }),
    prisma.orderItem.findMany({
      where: { order: { userId, status: { in: PAID_ORDER_STATUSES } } },
      orderBy: { order: { createdAt: "desc" } },
      take: 40,
      select: { product },
    }),
    prisma.storeFollow.findMany({ where: { userId }, select: { storeId: true } }),
    prisma.store.findFirst({ where: { seller: { userId } }, select: { id: true } }),
  ]);

  // How much the buyer seems to like each category and store.
  const categoryWeight = new Map<string, number>();
  const storeWeight = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string, by: number) => map.set(key, (map.get(key) ?? 0) + by);
  const signals: [typeof viewed, number][] = [[viewed, 1], [saved, 2], [carted, 2], [bought, 3]];
  for (const [rows, weight] of signals) {
    for (const { product } of rows) {
      bump(categoryWeight, product.categoryId, weight);
      bump(storeWeight, product.storeId, weight);
    }
  }
  const followed = new Set(follows.map((follow) => follow.storeId));
  for (const storeId of followed) bump(storeWeight, storeId, 4);

  const boughtIds = new Set(bought.map(({ product }) => product.id));
  const seenIds = new Set(viewed.map(({ product }) => product.id));
  const savedIds = new Set(saved.map(({ product }) => product.id));
  // Already bought or already in the cart - nothing to discover there.
  const excludedIds = [...boughtIds, ...carted.map(({ product }) => product.id)];
  const excluded: Prisma.ProductWhereInput = {
    id: { notIn: excludedIds },
    ...(ownStore ? { storeId: { not: ownStore.id } } : {}),
  };

  const topCategories = topIds(categoryWeight, 8);
  const topStores = topIds(storeWeight, 12);

  const [candidates, popular] = await Promise.all([
    topCategories.length || topStores.length
      ? prisma.product.findMany({
          where: {
            ...LIVE_PRODUCT,
            ...excluded,
            OR: [{ categoryId: { in: topCategories } }, { storeId: { in: topStores } }],
          },
          orderBy: { createdAt: "desc" },
          take: 150,
          include: CARD_INCLUDE,
        })
      : Promise.resolve([] as CardProduct[]),
    trendingIds(limit).then(({ scores }) => scores),
  ]);

  const newSince = daysAgo(14).getTime();
  const scored = candidates.map((candidate) => {
    const fromCategory = categoryWeight.get(candidate.categoryId) ?? 0;
    const fromStore = storeWeight.get(candidate.storeId) ?? 0;
    let score = fromCategory * 2 + fromStore * 1.5 + Math.log1p(popular.get(candidate.id) ?? 0);
    if (candidate.createdAt.getTime() >= newSince) score += 1;
    // Already known to the buyer - still shown, but after fresh finds.
    if (savedIds.has(candidate.id)) score -= 3;
    else if (seenIds.has(candidate.id)) score -= 1.5;

    const reason: Reason = followed.has(candidate.storeId) ? "FOLLOWED_STORE" : "SIMILAR";
    return { product: candidate, score, reason };
  });
  scored.sort((a, b) => b.score - a.score);

  const picks: (CardProduct & { reason: Reason })[] = [];
  const taken = new Set<string>();
  const add = (entries: { product: CardProduct; reason: Reason }[]) => {
    for (const { product: item, reason } of entries) {
      if (picks.length >= limit) return;
      if (taken.has(item.id)) continue;
      taken.add(item.id);
      picks.push({ ...item, reason });
    }
  };
  const withReason = (items: CardProduct[], reason: Reason) => items.map((item) => ({ product: item, reason }));

  // Mostly personal picks, a few popular ones so the list isn't only more
  // of the same - then new arrivals when there's little to go on yet.
  const personalShare = Math.ceil(limit * 0.75);
  add(scored.slice(0, personalShare));

  if (picks.length < limit) {
    add(withReason(await loadProducts(topIds(popular, limit * 3), excluded), "POPULAR"));
  }
  if (picks.length < limit) {
    add(scored.slice(personalShare));
  }
  if (picks.length < limit) {
    const newest = await prisma.product.findMany({
      where: { ...LIVE_PRODUCT, ...excluded },
      orderBy: { createdAt: "desc" },
      take: limit * 2,
      include: CARD_INCLUDE,
    });
    add(withReason(newest, "NEW"));
  }

  return picks;
};

/** Remembers that the user opened a product (feeds "For you", trending and "Recently viewed"). */
export const recordProductViewService = async (userId: string, productId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, store: { select: { seller: { select: { userId: true } } } } },
  });
  if (!product) throw new AppError("Product not found.", 404);

  // Sellers looking at their own listings aren't buyer interest.
  if (product.store.seller.userId === userId) return;

  await prisma.recentlyViewed.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: { viewedAt: new Date() },
  });

  // Now and then, drop this user's old views.
  if (Math.random() < 0.1) {
    await prisma.recentlyViewed.deleteMany({ where: { userId, viewedAt: { lt: daysAgo(VIEW_RETENTION_DAYS) } } });
  }
};

/** Products the user opened lately, newest first (sold-out ones too - they can ask to be notified). */
export const getRecentlyViewedService = async (userId: string, limit: number) => {
  const rows = await prisma.recentlyViewed.findMany({
    where: {
      userId,
      product: { status: { in: [ProductStatus.PUBLISHED, ProductStatus.OUT_OF_STOCK] }, store: { isSuspended: false } },
    },
    orderBy: { viewedAt: "desc" },
    take: limit,
    select: { product: { include: CARD_INCLUDE } },
  });
  return rows.map((row) => row.product);
};
