import { ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { findState } from "../../data/nigeria-locations";

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
