import { ProductStatus } from "@prisma/client";

import prisma from "../prisma/prisma";

// A listed product whose photos, name, description, price or options change
// is taken off the marketplace for a few minutes (status UPDATING) before
// buyers see it again - so nobody looks at, or pays for, one thing while
// the listing is being turned into another. Stock-only changes (restocking)
// don't count. Orders already placed keep what the buyer saw.
export const UPDATE_COOLDOWN_MINUTES = 5;
export const UPDATE_COOLDOWN_MS = UPDATE_COOLDOWN_MINUTES * 60 * 1000;

// What buyers judge a product by (names as in utils/productHistory).
const BUYER_FACING = new Set([
  "Title",
  "Description",
  "Price",
  "Compare-at price",
  "Condition",
  "Brand",
  "Category",
  "Highlights",
  "Specifications",
  "Photos",
  "Options",
]);

type WithVariations = { variations?: { option1: string; option2: string; price: number | null; isActive: boolean }[] };

// Sizes/colours and their prices - but not their stock.
const combinations = (product: WithVariations) =>
  JSON.stringify(
    (product.variations ?? [])
      .map((v) => [v.option1, v.option2, v.price, v.isActive])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  );

export const isBuyerFacingChange = (changes: { field: string }[], before: WithVariations, after: WithVariations) =>
  changes.some((change) => BUYER_FACING.has(change.field)) || combinations(before) !== combinations(after);

// Listed (or already updating) - the ones buyers can see.
export const LISTED_STATUSES: ProductStatus[] = [ProductStatus.PUBLISHED, ProductStatus.OUT_OF_STOCK, ProductStatus.UPDATING];

/**
 * Puts products whose few minutes are up back on sale: on sale if there's
 * stock, sold out if not. `ids` limits it to some products (e.g. the one a
 * buyer just opened) so nobody waits for the next job run.
 */
export const relistDueProducts = async (now = new Date(), ids?: string[]) => {
  const due = { status: ProductStatus.UPDATING, relistAt: { lte: now }, ...(ids ? { id: { in: ids } } : {}) };
  const [onSale, soldOut] = await prisma.$transaction([
    prisma.product.updateMany({ where: { ...due, stock: { gt: 0 } }, data: { status: ProductStatus.PUBLISHED, relistAt: null } }),
    prisma.product.updateMany({ where: { ...due, stock: { lte: 0 } }, data: { status: ProductStatus.OUT_OF_STOCK, relistAt: null } }),
  ]);
  return onSale.count + soldOut.count;
};
