import { ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";

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
