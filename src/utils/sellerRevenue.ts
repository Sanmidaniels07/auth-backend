import { OrderStatus } from "@prisma/client";

import prisma from "../prisma/prisma";

// Orders only count toward revenue once payment has actually happened.
export const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

export const getStoreAvailableBalance = async (
  storeId: string
) => {
  const [items, payouts] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        product: { storeId },
        order: { status: { in: REVENUE_STATUSES } },
      },
      select: { totalPrice: true, commissionRate: true },
    }),
    prisma.payout.aggregate({
      where: { storeId },
      _sum: { amount: true },
    }),
  ]);

  // Net of the platform's commission - each item carries the commission
  // rate that was in effect when it was ordered, so this isn't affected
  // by later changes to a category's rate.
  const totalRevenue = items.reduce(
    (sum, item) => sum + item.totalPrice * (1 - item.commissionRate / 100),
    0
  );
  const totalPaidOut = payouts._sum.amount ?? 0;

  return {
    totalRevenue,
    totalPaidOut,
    availableBalance: totalRevenue - totalPaidOut,
  };
};
