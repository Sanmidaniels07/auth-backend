import { OrderStatus, Prisma } from "@prisma/client";

import { AppError } from "./appError";

// Stock only goes down once a payment is confirmed. So that two buyers
// can't both pay for the last unit, an unpaid order holds its quantities
// for a while: other buyers can't start paying for stock that's held. If a
// payment still lands after its hold ran out and the item sold meanwhile,
// finalizeOrderPayment cancels and refunds it (checkout/sold-out-refund).
export const HOLD_MINUTES = 15;

// The production database is slow per query (~600ms), and a busy product
// makes the next checkout wait for its row lock - so be generous.
export const STOCK_HOLD_TX = { maxWait: 15_000, timeout: 30_000 };

export interface StockLine {
  productId: string;
  variationId: string | null;
  quantity: number;
  title: string;
}

/**
 * Run inside the transaction that creates the unpaid order. Locks the
 * products' rows (a second checkout for the same product waits here until
 * this order exists, then counts it as held) and checks every line against
 * stock minus what other buyers' recent unpaid orders hold. The buyer's own
 * earlier unpaid attempts don't count against them.
 */
export const assertStockAvailable = async (
  tx: Prisma.TransactionClient,
  userId: string,
  lines: StockLine[],
  now: Date = new Date()
) => {
  const productIds = Array.from(new Set(lines.map((line) => line.productId)));
  const variationIds = Array.from(new Set(lines.flatMap((line) => (line.variationId ? [line.variationId] : []))));

  await tx.$queryRaw`SELECT id FROM "Product" WHERE id IN (${Prisma.join(productIds)}) FOR UPDATE`;

  const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, stock: true } });
  const variations = variationIds.length
    ? await tx.productVariation.findMany({ where: { id: { in: variationIds } }, select: { id: true, stock: true } })
    : [];
  const held = await tx.orderItem.groupBy({
    by: ["productId", "variationId"],
    where: {
      productId: { in: productIds },
      order: {
        status: OrderStatus.PENDING,
        createdAt: { gte: new Date(now.getTime() - HOLD_MINUTES * 60 * 1000) },
        userId: { not: userId },
      },
    },
    _sum: { quantity: true },
  });

  const heldFor = (productId: string, variationId?: string) =>
    held
      .filter((row) => row.productId === productId && (variationId === undefined || row.variationId === variationId))
      .reduce((sum, row) => sum + (row._sum.quantity ?? 0), 0);

  const check = (title: string, wanted: number, stock: number, heldQty: number) => {
    const free = Math.max(0, stock - heldQty);
    if (wanted <= free) return;
    if (wanted > stock) throw new AppError(`Not enough stock for "${title}".`, 400);
    throw new AppError(
      free === 0
        ? `Someone is paying for the last of "${title}" right now. Try again in a few minutes - if their payment doesn't go through, it'll be yours.`
        : `Only ${free} of "${title}" can be bought right now (others are mid-payment). Lower the quantity or try again in a few minutes.`,
      409
    );
  };

  // A product's stock is the total of its combinations, so check both.
  for (const productId of productIds) {
    const own = lines.filter((line) => line.productId === productId);
    const stock = products.find((product) => product.id === productId)?.stock ?? 0;
    check(own[0].title, own.reduce((sum, line) => sum + line.quantity, 0), stock, heldFor(productId));
  }
  for (const line of lines) {
    if (!line.variationId) continue;
    const stock = variations.find((variation) => variation.id === line.variationId)?.stock ?? 0;
    check(line.title, line.quantity, stock, heldFor(line.productId, line.variationId));
  }
};

/** Thrown inside finalizeOrderPayment when a paid order's item has sold out. */
export class SoldOutError extends Error {
  constructor(public readonly productId: string) {
    super("Item sold out before payment was confirmed.");
  }
}
