import { Prisma, ProductStatus, ShippingOptionType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { findState } from "../../data/nigeria-locations";
import { AppError } from "../../utils/appError";
import { findArea, locate, servesArea, storeCoverage } from "../../utils/serviceAreas";

// Google accepts up to 50,000 URLs per sitemap file.
const MAX_ENTRIES = 45_000;

/**
 * Every page search engines should find: live products (published, store
 * not suspended) and stores with at least one of them. Ids/slugs and last
 * change only - the website builds the URLs.
 */
export const getSitemapEntriesService = async () => {
  const live = { status: ProductStatus.PUBLISHED, store: { isSuspended: false } };

  const [products, stores] = await Promise.all([
    prisma.product.findMany({
      where: live,
      orderBy: { updatedAt: "desc" },
      take: MAX_ENTRIES,
      select: { id: true, updatedAt: true },
    }),
    prisma.store.findMany({
      where: { isSuspended: false, products: { some: { status: ProductStatus.PUBLISHED } } },
      orderBy: { createdAt: "desc" },
      take: 5_000,
      select: {
        slug: true,
        createdAt: true,
        // A store page changes when its products do.
        products: { where: { status: ProductStatus.PUBLISHED }, orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
      },
    }),
  ]);

  return {
    products,
    stores: stores.map((store) => ({ slug: store.slug, updatedAt: store.products[0]?.updatedAt ?? store.createdAt })),
  };
};

/**
 * Categories that have live products, with how many and in which states -
 * what the public category pages ("Cakes & Pastries in Lagos") and their
 * links are built from. States use their standard names; products from
 * stores without a known state count towards the category only.
 */
export const getCatalogueService = async () => {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, slug: true, icon: true, isFeatured: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED, store: { isSuspended: false } },
      select: { categoryId: true, updatedAt: true, store: { select: { state: true } } },
    }),
  ]);

  const byCategory = new Map<string, { count: number; updatedAt: Date; states: Map<string, { count: number; updatedAt: Date }> }>();
  for (const product of products) {
    const entry = byCategory.get(product.categoryId) ?? { count: 0, updatedAt: product.updatedAt, states: new Map() };
    entry.count += 1;
    if (product.updatedAt > entry.updatedAt) entry.updatedAt = product.updatedAt;

    const state = findState(product.store.state)?.name;
    if (state) {
      const inState = entry.states.get(state) ?? { count: 0, updatedAt: product.updatedAt };
      inState.count += 1;
      if (product.updatedAt > inState.updatedAt) inState.updatedAt = product.updatedAt;
      entry.states.set(state, inState);
    }
    byCategory.set(product.categoryId, entry);
  }

  return {
    categories: categories.map((category) => {
      const entry = byCategory.get(category.id);
      return {
        slug: category.slug,
        name: category.name,
        icon: category.icon,
        isFeatured: category.isFeatured,
        productCount: entry?.count ?? 0,
        updatedAt: entry?.updatedAt ?? null,
        states: entry
          ? Array.from(entry.states, ([name, value]) => ({ name, productCount: value.count, updatedAt: value.updatedAt })).sort(
              (a, b) => b.productCount - a.productCount
            )
          : [],
      };
    }),
  };
};

/**
 * Everything Google Merchant Center needs to list live products in Google
 * Shopping (free listings): one entry per product, with its images, price
 * (and the compare-at price when it's on sale), stock, condition, brand,
 * category and store. The website serves it as an XML feed.
 */
export const getMerchantFeedService = async () => {
  const products = await prisma.product.findMany({
    where: { status: { in: [ProductStatus.PUBLISHED, ProductStatus.OUT_OF_STOCK] }, store: { isSuspended: false } },
    orderBy: { updatedAt: "desc" },
    take: MAX_ENTRIES,
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      originalPrice: true,
      stock: true,
      status: true,
      condition: true,
      brand: true,
      updatedAt: true,
      images: { orderBy: [{ isPrimary: "desc" }, { id: "asc" }], take: 10, select: { url: true } },
      category: { select: { name: true } },
      store: { select: { name: true } },
      // Products with options: the cheapest active one is the "from" price.
      variations: { where: { isActive: true, isArchived: false }, select: { price: true, stock: true } },
    },
  });

  return products
    .filter((product) => product.images.length > 0)
    .map(({ variations, images, category, store, ...product }) => {
      const prices = variations.map((v) => v.price ?? product.price);
      const stock = variations.length > 0 ? variations.reduce((sum, v) => sum + v.stock, 0) : product.stock;
      return {
        ...product,
        price: prices.length > 0 ? Math.min(...prices) : product.price,
        inStock: product.status === ProductStatus.PUBLISHED && stock > 0,
        images: images.map((image) => image.url),
        category: category.name,
        storeName: store.name,
      };
    });
};

// Stores with live products, with what's needed to place them in areas.
const liveStoresWithCoverage = <T extends Prisma.StoreSelect>(extra: T) =>
  prisma.store.findMany({
    where: { isSuspended: false, products: { some: { status: ProductStatus.PUBLISHED } } },
    select: {
      ...extra,
      id: true,
      city: true,
      state: true,
      shippingOptions: { where: { isArchived: false, type: ShippingOptionType.DELIVERY }, select: { areas: true, state: true } },
    },
  });

/**
 * Areas (neighbourhoods / LGAs) with sellers based in them or delivering
 * to them, by state - what the public "Cakes & Pastries in Lekki, Lagos"
 * pages and their sitemap entries are built from. Each area has its store
 * and live product counts, overall and per category.
 */
export const getAreasService = async () => {
  const stores = await liveStoresWithCoverage({
    products: { where: { status: ProductStatus.PUBLISHED }, select: { updatedAt: true, category: { select: { slug: true } } } },
  });

  interface AreaEntry { stores: number; products: number; updatedAt: Date; categories: Map<string, number> }
  const byState = new Map<string, Map<string, AreaEntry>>();

  for (const store of stores) {
    for (const [state, areas] of storeCoverage(store)) {
      const inState = byState.get(state) ?? new Map<string, AreaEntry>();
      for (const area of areas) {
        const entry = inState.get(area) ?? { stores: 0, products: 0, updatedAt: new Date(0), categories: new Map() };
        entry.stores += 1;
        for (const product of store.products) {
          entry.products += 1;
          if (product.updatedAt > entry.updatedAt) entry.updatedAt = product.updatedAt;
          entry.categories.set(product.category.slug, (entry.categories.get(product.category.slug) ?? 0) + 1);
        }
        inState.set(area, entry);
      }
      byState.set(state, inState);
    }
  }

  const states = Array.from(byState, ([name, areas]) => ({
    name,
    areas: Array.from(areas, ([area, entry]) => ({
      name: area,
      storeCount: entry.stores,
      productCount: entry.products,
      updatedAt: entry.updatedAt,
      categories: Array.from(entry.categories, ([slug, productCount]) => ({ slug, productCount })).sort((a, b) => b.productCount - a.productCount),
    })).sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name)),
  }));

  const total = (state: (typeof states)[number]) => state.areas.reduce((sum, area) => sum + area.productCount, 0);
  return { states: states.sort((a, b) => total(b) - total(a)) };
};

/** Ids of live stores based in or delivering to an area. */
export const storeIdsServingArea = async (state: string, area: string) =>
  (await liveStoresWithCoverage({})).filter((store) => servesArea(store, state, area)).map((store) => store.id);

/**
 * Sellers serving an area (optionally only those with live products in a
 * category): sellers based there first, then the best rated. Public store
 * details only - never contact details or payout information.
 */
export const getAreaSellersService = async ({ state, area, category }: { state: string; area: string; category?: string }) => {
  const canonicalState = findState(state)?.name;
  const canonicalArea = canonicalState ? findArea(canonicalState, area) : null;
  if (!canonicalState || !canonicalArea) throw new AppError("Unknown area.", 404);

  const liveProducts = { status: ProductStatus.PUBLISHED, ...(category ? { category: { slug: category } } : {}) };
  const stores = (
    await liveStoresWithCoverage({
      name: true,
      slug: true,
      logo: true,
      rating: true,
      totalSales: true,
      isVerified: true,
      _count: { select: { products: { where: liveProducts }, reviews: true } },
    })
  ).filter((store) => store._count.products > 0 && servesArea(store, canonicalState, canonicalArea));

  const sellers = stores
    .map((store) => {
      const home = locate(store);
      return {
        name: store.name,
        slug: store.slug,
        logo: store.logo,
        rating: store.rating,
        totalSales: store.totalSales,
        isVerified: store.isVerified,
        city: store.city,
        state: store.state,
        productCount: store._count.products,
        reviewCount: store._count.reviews,
        basedHere: home.state === canonicalState && home.area === canonicalArea,
      };
    })
    .sort((a, b) => Number(b.basedHere) - Number(a.basedHere) || b.rating - a.rating || b.productCount - a.productCount)
    .slice(0, 24);

  return { state: canonicalState, area: canonicalArea, total: stores.length, sellers };
};
