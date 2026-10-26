import { ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

// "Notify me when it's back" (see shopping-alerts.service for the sending).

const assertWatchable = async (productId: string, variationId?: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, status: { in: [ProductStatus.PUBLISHED, ProductStatus.OUT_OF_STOCK] }, store: { isSuspended: false } },
    select: { id: true, variations: variationId ? { where: { id: variationId, isArchived: false }, select: { id: true } } : false },
  });
  if (!product) throw new AppError("Product not found.", 404);
  if (variationId && product.variations.length === 0) throw new AppError("That option isn't available for this product.", 404);
};

export const createStockAlertService = async (userId: string, productId: string, variationId?: string) => {
  await assertWatchable(productId, variationId);

  // Nullable variationId can't be part of a unique index, so check first.
  const existing = await prisma.stockAlert.findFirst({ where: { userId, productId, variationId: variationId ?? null } });
  return existing ?? prisma.stockAlert.create({ data: { userId, productId, variationId: variationId ?? null } });
};

export const deleteStockAlertService = async (userId: string, productId: string, variationId?: string) => {
  await prisma.stockAlert.deleteMany({ where: { userId, productId, variationId: variationId ?? null } });
};

/** What the user is watching on this product: the whole product (null) and/or option ids. */
export const getMyStockAlertsForProductService = async (userId: string, productId: string) => {
  const alerts = await prisma.stockAlert.findMany({ where: { userId, productId }, select: { variationId: true } });
  return { variationIds: alerts.map((alert) => alert.variationId) };
};
