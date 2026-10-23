import { NotificationType, OrderEventType, OrderItemStatus, ShippingOptionType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { sendEmail } from "../auth/email.services";
import { createNotificationService } from "../notification/notification.service";
import {
  EmailOrderLine,
  itemCancelledEmail,
  newOrderEmail,
  orderConfirmedEmail,
  orderDeliveredEmail,
  orderShippedEmail,
  problemReportedEmail,
} from "../../templates/order-emails.template";
import { AUTO_CONFIRM_DAYS, RETURN_WINDOW_DAYS, orderNumber } from "./order-delivery";

// Every order alert goes through deliver(): in-app (stored + pushed live
// over the socket) and, when given, email. New channels (e.g. WhatsApp
// once a provider is set up) plug in here without touching call sites.
//
// All notify* functions are fire-and-forget: a failed email must never
// fail the order action that triggered it.

interface Recipient {
  id: string;
  name: string;
  email: string;
}

interface Delivery {
  to: Recipient;
  title: string;
  message: string;
  // ORDER opens the buyer's order page, SELLER_ORDER the seller's orders tab.
  target: { type: "ORDER" | "SELLER_ORDER"; id: string };
  email?: { subject: string; html: string };
}

const frontend = () => process.env.FRONTEND_URL ?? "";
const buyerOrderUrl = (orderId: string) => `${frontend()}/marketplace/orders/${orderId}`;
const sellerOrdersUrl = () => `${frontend()}/settings/marketplace?tab=orders`;
const sellerReturnsUrl = () => `${frontend()}/settings/marketplace?tab=returns`;

const deliver = async ({ to, title, message, target, email }: Delivery) => {
  await Promise.allSettled([
    createNotificationService(to.id, title, message, NotificationType.ORDER, target),
    email ? sendEmail(to.email, email.subject, email.html) : Promise.resolve(),
  ]).then((results) =>
    results.forEach((result) => {
      if (result.status === "rejected") console.error(`Order notification to ${to.id} failed:`, result.reason);
    })
  );
};

const safely = (label: string, fn: () => Promise<void>) => {
  fn().catch((error) => console.error(`${label} failed:`, error));
};

const USER_SELECT = { id: true, name: true, email: true } as const;

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

const lineOf = (item: { quantity: number; totalPrice: number; product: { title: string } }): EmailOrderLine => ({
  title: item.product.title,
  quantity: item.quantity,
  totalPrice: item.totalPrice,
});

// Buyer gets a confirmation (with their delivery codes); each seller in
// the order gets told about just their part of it.
export const notifyOrderPaid = (orderId: string) =>
  safely("Order paid notifications", async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: USER_SELECT },
        shipping: { include: { store: { select: { id: true, name: true } } } },
        sellerNotes: { select: { storeId: true, note: true } },
        items: {
          include: {
            product: {
              select: {
                title: true,
                store: { select: { id: true, name: true, seller: { select: { user: { select: USER_SELECT } } } } },
              },
            },
          },
        },
      },
    });
    if (!order) return;

    const number = orderNumber(order.id);

    await deliver({
      to: order.user,
      title: "Order confirmed",
      message: `Your payment for order ${number} went through. The seller is preparing it.`,
      target: { type: "ORDER", id: order.id },
      email: {
        subject: `Order ${number} confirmed`,
        html: orderConfirmedEmail({
          name: order.user.name,
          orderNumber: number,
          lines: order.items.map(lineOf),
          total: order.total,
          codes: order.shipping
            .filter((s) => s.deliveryCode)
            .map((s) => ({ storeName: s.store.name, code: s.deliveryCode as string, pickupAddress: s.pickupAddress })),
          orderUrl: buyerOrderUrl(order.id),
        }),
      },
    });

    const itemsByStore = new Map<string, typeof order.items>();
    order.items.forEach((item) => {
      const list = itemsByStore.get(item.product.store.id) ?? [];
      list.push(item);
      itemsByStore.set(item.product.store.id, list);
    });

    await Promise.all(
      Array.from(itemsByStore.values()).map((items) => {
        const store = items[0].product.store;
        const seller = store.seller.user;
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        const shipment = order.shipping.find((s) => s.storeId === store.id);
        const isPickup = shipment?.type === ShippingOptionType.PICKUP;
        const buyerNote = order.sellerNotes.find((n) => n.storeId === store.id)?.note ?? null;

        return deliver({
          to: seller,
          title: buyerNote ? "New order - with a note" : "New order",
          message: `Order ${number}: ${count} item${count === 1 ? "" : "s"} from ${store.name}. ${
            isPickup ? "The buyer will pick it up - get it ready." : "Prepare it for delivery."
          }${buyerNote ? ` Buyer's note: "${truncate(buyerNote, 140)}"` : ""}`,
          target: { type: "SELLER_ORDER", id: order.id },
          email: {
            subject: `New order ${number} for ${store.name}`,
            html: newOrderEmail({
              sellerName: seller.name,
              storeName: store.name,
              orderNumber: number,
              lines: items.map(lineOf),
              subtotal,
              shippingOption: shipment?.optionName ?? null,
              isPickup,
              buyerNote,
              ordersUrl: sellerOrdersUrl(),
            }),
          },
        });
      })
    );
  });

// A seller usually moves all their items in an order together, one request
// per item - only the first item of a batch (same order, store and status
// within a few minutes) triggers an alert, covering all of them.
const BATCH_WINDOW_MS = 10 * 60 * 1000;

export const notifyItemStatusChanged = (orderItemId: string, status: OrderItemStatus, confirmedWithCode: boolean) =>
  safely("Order status notification", async () => {
    if (status === OrderItemStatus.PENDING) return;

    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        product: { select: { title: true, storeId: true, store: { select: { name: true } } } },
        order: { select: { id: true, user: { select: USER_SELECT } } },
      },
    });
    if (!item) return;

    const eventType = status as OrderEventType;
    const alreadyNotified = await prisma.orderEvent.findFirst({
      where: {
        orderId: item.order.id,
        type: eventType,
        orderItemId: { not: item.id },
        orderItem: { product: { storeId: item.product.storeId } },
        createdAt: { gte: new Date(Date.now() - BATCH_WINDOW_MS) },
      },
    });
    if (alreadyNotified) return;

    // Everything of this store's in the order that's now at this status.
    const batch = await prisma.orderItem.findMany({
      where: { orderId: item.order.id, status, product: { storeId: item.product.storeId } },
      include: { product: { select: { title: true } } },
    });
    const lines = batch.map(lineOf);
    const buyer = item.order.user;
    const shipment = await prisma.orderShipping.findUnique({
      where: { orderId_storeId: { orderId: item.order.id, storeId: item.product.storeId } },
      select: { type: true, pickupAddress: true },
    });
    const pickupAddress = shipment?.type === ShippingOptionType.PICKUP ? shipment.pickupAddress ?? "the seller's store" : null;
    const number = orderNumber(item.order.id);
    const storeName = item.product.store.name;
    const target = { type: "ORDER" as const, id: item.order.id };
    const orderUrl = buyerOrderUrl(item.order.id);

    if (status === OrderItemStatus.PROCESSING) {
      await deliver({ to: buyer, title: "Order being prepared", message: `${storeName} is preparing your order ${number}.`, target });
      return;
    }

    // For pickup, "shipped" means the order is ready to collect.
    if (status === OrderItemStatus.SHIPPED) {
      await deliver({
        to: buyer,
        title: pickupAddress ? "Ready for pickup" : "Order shipped",
        message: pickupAddress
          ? `Your order ${number} from ${storeName} is ready. Pick it up at ${pickupAddress} and bring your code.`
          : `${storeName} has sent out your order ${number}. Keep your delivery code handy.`,
        target,
        email: {
          subject: pickupAddress ? `Order ${number} is ready for pickup` : `Order ${number} is on its way`,
          html: orderShippedEmail({ name: buyer.name, orderNumber: number, storeName, lines, orderUrl, pickupAddress }),
        },
      });
      return;
    }

    if (status === OrderItemStatus.DELIVERED) {
      await deliver({
        to: buyer,
        title: confirmedWithCode ? (pickupAddress ? "Order picked up" : "Order delivered") : "Did your order arrive?",
        message: confirmedWithCode
          ? `Your order ${number} from ${storeName} was delivered and confirmed with your code.`
          : `${storeName} marked order ${number} as delivered. Confirm you received it or report a problem.`,
        target,
        email: {
          subject: confirmedWithCode ? `Order ${number} delivered` : `Did you receive order ${number}?`,
          html: orderDeliveredEmail({
            name: buyer.name,
            orderNumber: number,
            storeName,
            lines,
            confirmed: confirmedWithCode,
            autoConfirmDays: AUTO_CONFIRM_DAYS,
            returnWindowDays: RETURN_WINDOW_DAYS,
            orderUrl,
          }),
        },
      });
      return;
    }

    if (status === OrderItemStatus.CANCELLED) {
      await deliver({
        to: buyer,
        title: "Item cancelled",
        message: `${storeName} cancelled part of your order ${number}.`,
        target,
        email: { subject: `Update on order ${number}`, html: itemCancelledEmail({ name: buyer.name, orderNumber: number, storeName, lines, orderUrl }) },
      });
    }
  });

const sellerOfItem = (orderItemId: string) =>
  prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: { select: { id: true, user: { select: USER_SELECT } } },
      product: { select: { title: true, store: { select: { name: true, seller: { select: { user: { select: USER_SELECT } } } } } } },
    },
  });

export const notifyDeliveryConfirmed = (orderItemId: string, by: "BUYER" | "AUTO") =>
  safely("Delivery confirmed notification", async () => {
    const item = await sellerOfItem(orderItemId);
    if (!item) return;
    const number = orderNumber(item.order.id);

    await deliver({
      to: item.product.store.seller.user,
      title: "Delivery confirmed",
      message:
        by === "BUYER"
          ? `The buyer confirmed they received "${item.product.title}" (order ${number}).`
          : `"${item.product.title}" (order ${number}) was confirmed delivered automatically.`,
      target: { type: "SELLER_ORDER", id: item.order.id },
    });

    if (by === "AUTO") {
      await deliver({
        to: item.order.user,
        title: "Delivery confirmed",
        message: `We've confirmed delivery of "${item.product.title}" (order ${number}). You can still request a return for ${RETURN_WINDOW_DAYS} days.`,
        target: { type: "ORDER", id: item.order.id },
      });
    }
  });

export const notifyOrderCancelledByBuyer = (orderId: string) =>
  safely("Order cancelled notification", async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { select: { store: { select: { id: true, seller: { select: { user: { select: USER_SELECT } } } } } } } } } },
    });
    if (!order) return;

    const sellers = new Map<string, Recipient>();
    order.items.forEach((item) => sellers.set(item.product.store.id, item.product.store.seller.user));

    await Promise.all(
      Array.from(sellers.values()).map((seller) =>
        deliver({
          to: seller,
          title: "Order cancelled",
          message: `The buyer cancelled order ${orderNumber(order.id)}. No need to fulfil it.`,
          target: { type: "SELLER_ORDER", id: order.id },
        })
      )
    );
  });

export const notifyProblemReported = (orderItemId: string, reason: string) =>
  safely("Problem reported notification", async () => {
    const item = await sellerOfItem(orderItemId);
    if (!item) return;
    const seller = item.product.store.seller.user;
    const number = orderNumber(item.order.id);

    await deliver({
      to: seller,
      title: "Buyer reported a problem",
      message: `A return request was opened for "${item.product.title}" (order ${number}).`,
      target: { type: "SELLER_ORDER", id: item.order.id },
      email: {
        subject: `Problem reported on order ${number}`,
        html: problemReportedEmail({ sellerName: seller.name, orderNumber: number, itemTitle: item.product.title, reason, returnsUrl: sellerReturnsUrl() }),
      },
    });
  });

export const notifyReturnStatusChanged = (orderItemId: string, status: string) =>
  safely("Return status notification", async () => {
    const item = await sellerOfItem(orderItemId);
    if (!item) return;

    await deliver({
      to: item.order.user,
      title: `Return ${status.toLowerCase()}`,
      message: `Your return request for "${item.product.title}" (order ${orderNumber(item.order.id)}) was ${status.toLowerCase()}.`,
      target: { type: "ORDER", id: item.order.id },
    });
  });
