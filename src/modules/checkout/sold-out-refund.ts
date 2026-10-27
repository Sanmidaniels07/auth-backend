import { OrderEventActor, OrderEventType, OrderItemStatus, OrderRefundStatus, OrderStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { refundPaystackTransaction } from "../../utils/paystack";
import { recordOrderEvent } from "../order/order-delivery";
import { notifySoldOutRefund } from "../order/order-notifications";

/**
 * A payment landed for an item that sold out to someone else first (see
 * utils/stockHold). Nothing was taken from stock and the seller was never
 * told about the order: cancel it, refund the buyer through Paystack, and
 * tell them. If Paystack refuses the refund, admins are told to do it by
 * hand.
 */
export const cancelSoldOutOrder = async (orderId: string, soldOutProductId: string) => {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { select: { productId: true, productTitle: true, product: { select: { title: true } } } } },
  });
  const item = order.items.find((line) => line.productId === soldOutProductId);
  const title = item?.productTitle ?? item?.product.title ?? "An item";

  const cancelled = await prisma.$transaction(async (tx) => {
    await tx.orderItem.updateMany({ where: { orderId }, data: { status: OrderItemStatus.CANCELLED } });
    await recordOrderEvent(tx, { orderId, type: OrderEventType.CANCELLED, actor: OrderEventActor.SYSTEM });
    return tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelReason: `"${title}" sold out just before your payment went through.`,
        refundStatus: OrderRefundStatus.REQUESTED,
      },
    });
  });

  let refunded = true;
  try {
    if (!order.paymentReference) throw new Error("No payment reference");
    await refundPaystackTransaction(order.paymentReference);
  } catch (error) {
    refunded = false;
    console.error(`Automatic refund for sold-out order ${orderId} failed:`, error);
    await prisma.order.update({ where: { id: orderId }, data: { refundStatus: OrderRefundStatus.FAILED } });
  }

  notifySoldOutRefund(orderId, refunded);

  return prisma.order.findUniqueOrThrow({ where: { id: cancelled.id }, include: { items: true } });
};
