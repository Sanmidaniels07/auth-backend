import { OrderItemStatus, OrderStatus, PayoutStatus, ReturnRequestStatus } from "@prisma/client";

import prisma from "../prisma/prisma";
import { SELLER_VISIBLE_ORDER } from "./giftOrders";

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
  const [items, deliveryFees, payouts] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        product: { storeId },
        // Unclaimed gifts are still refundable - not the seller's yet.
        order: { status: { in: REVENUE_STATUSES }, ...SELLER_VISIBLE_ORDER },
        // Items already routed straight to the seller via a Paystack split
        // at checkout aren't part of this manual ledger - that money never
        // touched the platform's main account.
        autoPaidViaSplit: false,
        // Hold-then-pay orders are paid by the payout run, not this ledger
        // (modules/payout/held-payout.service).
        NOT: { order: { shipping: { some: { storeId, heldForPayout: true } } } },
        // Refunded to the buyer - not the seller's.
        returnRequests: { none: { status: ReturnRequestStatus.REFUNDED } },
        status: { not: OrderItemStatus.CANCELLED },
      },
      select: { totalPrice: true, commissionRate: true },
    }),
    // The seller does the delivery, so delivery fees the platform received
    // (anything not split straight to them) are owed to the seller in full -
    // no commission is taken on them.
    prisma.orderShipping.aggregate({
      where: {
        storeId,
        order: { status: { in: REVENUE_STATUSES }, ...SELLER_VISIBLE_ORDER },
        paidViaSplit: false,
        heldForPayout: false,
      },
      _sum: { fee: true },
    }),
    // Payouts recorded against this ledger - not ones that paid held orders.
    prisma.payout.aggregate({
      where: { storeId, status: PayoutStatus.PAID, shipping: { none: {} } },
      _sum: { amount: true },
    }),
  ]);

  // Net of the platform's commission - each item carries the commission
  // rate that was in effect when it was ordered, so this isn't affected
  // by later changes to a category's rate.
  const totalRevenue =
    items.reduce(
      (sum, item) => sum + item.totalPrice * (1 - item.commissionRate / 100),
      0
    ) + (deliveryFees._sum.fee ?? 0);
  const totalPaidOut = payouts._sum.amount ?? 0;

  return {
    totalRevenue,
    totalPaidOut,
    availableBalance: totalRevenue - totalPaidOut,
  };
};
