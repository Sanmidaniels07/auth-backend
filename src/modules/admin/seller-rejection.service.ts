import {
  GiftStatus,
  NotificationType,
  OrderEventActor,
  OrderEventType,
  OrderItemStatus,
  OrderRefundStatus,
  OrderStatus,
  Role,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { refundPaystackTransaction } from "../../utils/paystack";
import { recordOrderEvent } from "../order/order-delivery";
import { computeOrderStatus } from "../order/order.service";
import { notifySellerRemovedRefund } from "../order/order-notifications";
import { createNotificationService } from "../notification/notification.service";
import { heldAmountForStore } from "../payout/held-payout.service";

// What happens to orders already paid when a seller is rejected.
//
// "Stop new sales" (the default): the store is suspended so nothing new can
// be ordered, but the seller can still fulfil the open orders (Store.
// salesStoppedAt) - buyers keep their delivery-code protection.
//
// "Fraud": every one of the store's items not yet delivered is cancelled
// and refunded through Paystack, and the buyers are told. Delivered items
// stay held for the admins to decide on.

const PAID: OrderStatus[] = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED];
const NOT_DELIVERED: OrderItemStatus[] = [OrderItemStatus.PENDING, OrderItemStatus.PROCESSING, OrderItemStatus.SHIPPED];

const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
const round = (value: number) => Math.round(value * 100) / 100;

/** Paid orders with something from this store still to be delivered. */
const loadOpenOrders = (storeId: string) =>
  prisma.order.findMany({
    where: {
      status: { in: PAID },
      items: { some: { product: { storeId }, status: { in: NOT_DELIVERED } } },
    },
    include: {
      items: { include: { product: { select: { storeId: true } } } },
      shipping: true,
      gift: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

type OpenOrder = Awaited<ReturnType<typeof loadOpenOrders>>[number];

/**
 * This store's part of an open order: the items not yet delivered, what
 * refunding them is worth (their price, plus the delivery fee when nothing
 * of theirs was delivered), and whether Nestly holds that money (not split
 * to the seller at checkout, not paid out yet) so it can refund it itself.
 */
export const storePart = (order: OpenOrder, storeId: string) => {
  const mine = order.items.filter((item) => item.product.storeId === storeId);
  const open = mine.filter((item) => NOT_DELIVERED.includes(item.status));
  const deliveredSome = mine.some((item) => item.status === OrderItemStatus.DELIVERED);
  const shipment = order.shipping.find((s) => s.storeId === storeId);
  const itemsValue = open.reduce((sum, item) => sum + item.totalPrice, 0);
  const amount = round(Math.min(order.total, itemsValue + (!deliveredSome ? shipment?.fee ?? 0 : 0)));
  const nestlyHoldsIt =
    !!order.paymentReference && !shipment?.paidViaSplit && !shipment?.payoutId && !open.some((item) => item.autoPaidViaSplit);
  // The whole order is this store's and nothing has been delivered: refund it all.
  const wholeOrder = order.items.every((item) => item.product.storeId === storeId) && !deliveredSome;
  return { open, amount, nestlyHoldsIt, wholeOrder };
};

/** For the admin before they reject: what's in progress and what fraud mode would do. */
export const openOrdersSummaryService = async (storeId: string) => {
  const [orders, held] = await Promise.all([loadOpenOrders(storeId), heldAmountForStore(storeId)]);
  const parts = orders.map((order) => storePart(order, storeId));
  const refundable = parts.filter((part) => part.nestlyHoldsIt);
  return {
    openOrders: orders.length,
    openAmount: round(parts.reduce((sum, part) => sum + part.amount, 0)),
    // Fraud mode refunds these automatically...
    refundableOrders: refundable.length,
    refundableAmount: round(refundable.reduce((sum, part) => sum + part.amount, 0)),
    // ...these were already paid to the seller (split at checkout), so need a person.
    manualOrders: parts.length - refundable.length,
    // Everything Nestly holds for the store (delivered and not).
    heldAmount: held,
  };
};

/**
 * Fraud rejection: cancel and refund every item of this store not yet
 * delivered. Returns what happened; admins are told about anything that
 * needs a person (already paid to the seller, or Paystack refused).
 */
export const refundOpenOrdersForFraud = async (storeId: string, storeName: string) => {
  const orders = await loadOpenOrders(storeId);
  const result = { refunded: 0, refundedAmount: 0, failed: 0, manual: 0 };
  const reason = `${storeName} was removed from Nestly, so the items you hadn't received yet were cancelled.`;

  for (const order of orders) {
    const part = storePart(order, storeId);
    if (part.open.length === 0) continue;
    if (!part.nestlyHoldsIt) {
      result.manual += 1;
      continue;
    }

    // Cancel this store's undelivered items; the order follows its items.
    const claimed = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.orderItem.updateMany({
        where: { id: { in: part.open.map((item) => item.id) }, status: { in: NOT_DELIVERED } },
        data: { status: OrderItemStatus.CANCELLED },
      });
      if (cancelled.count === 0) return false;

      const items = await tx.orderItem.findMany({ where: { orderId: order.id }, select: { status: true } });
      const status = computeOrderStatus(items);
      await recordOrderEvent(tx, { orderId: order.id, type: OrderEventType.CANCELLED, actor: OrderEventActor.SYSTEM, note: reason });
      await tx.order.update({
        where: { id: order.id },
        data: {
          status,
          refundStatus: OrderRefundStatus.REQUESTED,
          ...(status === OrderStatus.CANCELLED ? { cancelReason: reason } : {}),
        },
      });
      // An unclaimed or claimed gift from this store won't arrive.
      if (order.gift && (order.gift.status === GiftStatus.SENT || order.gift.status === GiftStatus.CLAIMED) && status === OrderStatus.CANCELLED) {
        await tx.gift.update({ where: { id: order.gift.id }, data: { status: GiftStatus.CANCELLED } });
      }
      return true;
    });
    if (!claimed) continue;

    let refunded = true;
    try {
      await refundPaystackTransaction(order.paymentReference!, part.wholeOrder ? undefined : Math.round(part.amount * 100));
      result.refunded += 1;
      result.refundedAmount = round(result.refundedAmount + part.amount);
    } catch (error) {
      refunded = false;
      result.failed += 1;
      console.error(`Fraud-rejection refund for order ${order.id} failed:`, error);
      await prisma.order.update({ where: { id: order.id }, data: { refundStatus: OrderRefundStatus.FAILED } });
    }
    notifySellerRemovedRefund(order.id, storeName, part.amount, refunded);
  }

  if (result.failed || result.manual) {
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN, deletedAt: null }, select: { id: true } });
    const parts = [
      result.failed ? `${result.failed} refund${result.failed === 1 ? "" : "s"} Paystack refused` : "",
      result.manual ? `${result.manual} order${result.manual === 1 ? " was" : "s were"} already paid to the seller` : "",
    ].filter(Boolean);
    await Promise.allSettled(
      admins.map((admin) =>
        createNotificationService(
          admin.id,
          "Refunds need you",
          `After rejecting ${storeName}: ${parts.join(" and ")}. Refund those buyers by hand in Paystack.`,
          NotificationType.SYSTEM,
          { type: "ADMIN_REFUND_NEEDED", id: storeId }
        )
      )
    );
  }

  return { ...result, refundedAmountLabel: naira(result.refundedAmount) };
};
