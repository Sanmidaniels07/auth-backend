import {
  DeliveryConfirmation,
  OrderEventActor,
  OrderEventType,
  OrderItemStatus,
  OrderStatus,
  Prisma,
  ProductStatus,
  ReturnRequestStatus,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { asOrdered, listingChangedSince } from "../../utils/orderItemSnapshot";
import { getSellerStore } from "../seller/seller.utils";
import {
  MAX_DELIVERY_CODE_ATTEMPTS,
  autoConfirmCutoff,
  recordOrderEvent,
  returnWindowEndsAt,
} from "./order-delivery";
import {
  notifyDeliveryConfirmed,
  notifyItemStatusChanged,
  notifyOrderCancelledByBuyer,
} from "./order-notifications";

const ITEM_STATUS_RANK: Record<OrderItemStatus, number> = {
  PENDING: 0,
  PROCESSING: 1,
  SHIPPED: 2,
  DELIVERED: 3,
  CANCELLED: -1,
};

// An order can't be considered "shipped" until every seller's items in it have
// shipped, so the order-level status is the least-progressed of its active items.
const computeOrderStatus = (
  items: { status: OrderItemStatus }[]
): OrderStatus => {
  const activeItems = items.filter(
    (item) => item.status !== OrderItemStatus.CANCELLED
  );

  if (activeItems.length === 0) {
    return OrderStatus.CANCELLED;
  }

  const minRank = Math.min(
    ...activeItems.map((item) => ITEM_STATUS_RANK[item.status])
  );

  switch (minRank) {
    case 1:
      return OrderStatus.PROCESSING;
    case 2:
      return OrderStatus.SHIPPED;
    case 3:
      return OrderStatus.DELIVERED;
    default:
      return OrderStatus.PAID;
  }
};

const ORDER_STEPS: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

// Dates come from the order's event history. An order-level step is
// reached when its last item gets there (least-progressed rule above), so
// its date is the latest matching event. Orders from before events were
// recorded fall back to createdAt/updatedAt.
const buildOrderTimeline = (order: {
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  events: { type: OrderEventType; createdAt: Date }[];
}) => {
  const lastEventAt = (type: OrderEventType) => {
    const matching = order.events.filter((event) => event.type === type);
    return matching.length ? matching[matching.length - 1].createdAt : null;
  };

  if (order.status === OrderStatus.CANCELLED) {
    return [
      { step: OrderStatus.PENDING, completed: true, current: false, at: order.createdAt },
      {
        step: OrderStatus.CANCELLED,
        completed: true,
        current: true,
        at: lastEventAt(OrderEventType.CANCELLED) ?? order.updatedAt,
      },
    ];
  }

  const currentIndex = ORDER_STEPS.indexOf(order.status);

  return ORDER_STEPS.map((step, index) => {
    const completed = index <= currentIndex;
    let at: Date | null = null;

    if (index === 0) at = order.createdAt;
    else if (completed) {
      at = lastEventAt(step as OrderEventType) ?? (index === currentIndex ? order.updatedAt : null);
    }

    return { step, completed, current: index === currentIndex, at };
  });
};

const CUSTOMER_ORDER_INCLUDE = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          title: true,
          // PRIVATE = bought through a payment link (no product page).
          status: true,
          // Current listing - only compared with the order's copy (see
          // asOrderedForBuyer), then dropped from the response.
          description: true,
          brand: true,
          condition: true,
          highlights: true,
          specifications: { select: { name: true, value: true } },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          store: {
            select: { id: true, name: true },
          },
        },
      },
    },
  },
  address: true,
  paymentLink: { select: { code: true } },
  // Includes the buyer's own delivery codes - this include is only ever
  // used for the order's owner.
  shipping: true,
  sellerNotes: { select: { storeId: true, note: true } },
  events: {
    orderBy: { createdAt: "asc" as const },
    select: { id: true, orderItemId: true, type: true, actor: true, note: true, createdAt: true },
  },
};

// The item as ordered, plus whether the seller has changed the listing since.
const asOrderedForBuyer = <T extends Prisma.OrderItemGetPayload<{ include: typeof CUSTOMER_ORDER_INCLUDE.items.include }>>(
  item: T
) => {
  const { description, brand, condition, highlights, specifications, ...product } = item.product;
  const listingChanged = listingChangedSince(item, { ...item.product, images: item.product.images });
  return { ...asOrdered({ ...item, product }), listingChanged };
};

// Per-item delivery state the buyer's order page needs.
const withDeliveryState = <T extends { status: OrderItemStatus; deliveredAt: Date | null; deliveryConfirmedAt: Date | null }>(
  item: T
) => {
  const windowEnds = item.deliveryConfirmedAt ? returnWindowEndsAt(item.deliveryConfirmedAt) : null;

  return {
    ...item,
    awaitingConfirmation: item.status === OrderItemStatus.DELIVERED && !item.deliveryConfirmedAt,
    returnWindowEndsAt: windowEnds,
    // Unconfirmed deliveries can always be reported (that's the dispute path).
    returnWindowOpen: item.status === OrderItemStatus.DELIVERED && (!windowEnds || windowEnds > new Date()),
  };
};

export const getCustomerOrdersService = async (
  userId: string,
  page: number,
  limit: number,
  status?: OrderStatus
) => {
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: CUSTOMER_ORDER_INCLUDE,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map((order) => ({ ...order, items: order.items.map(asOrderedForBuyer) })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getCustomerOrderByIdService = async (
  userId: string,
  orderId: string
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: CUSTOMER_ORDER_INCLUDE,
  });

  if (!order || order.userId !== userId) {
    throw new AppError("Order not found.", 404);
  }

  return {
    ...order,
    items: order.items.map(asOrderedForBuyer).map(withDeliveryState),
    timeline: buildOrderTimeline(order),
  };
};

export const cancelOrderService = async (
  userId: string,
  orderId: string
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.userId !== userId) {
    throw new AppError("Order not found.", 404);
  }

  if (order.status === OrderStatus.CANCELLED) {
    throw new AppError("Order is already cancelled.", 400);
  }

  if (order.status === OrderStatus.DELIVERED) {
    throw new AppError(
      "Delivered orders cannot be cancelled.",
      400
    );
  }

  const hasStartedFulfillment = order.items.some(
    (item) =>
      item.status !== OrderItemStatus.PENDING &&
      item.status !== OrderItemStatus.CANCELLED
  );

  if (hasStartedFulfillment) {
    throw new AppError(
      "This order can no longer be cancelled because fulfillment has already started.",
      400
    );
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    await tx.orderItem.updateMany({
      where: { orderId },
      data: { status: OrderItemStatus.CANCELLED },
    });

    // Stock is only decremented once payment is confirmed, so only restock
    // if this order had actually reached that point.
    if (order.status !== OrderStatus.PENDING) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        if (item.variationId) {
          await tx.productVariation.update({
            where: { id: item.variationId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // Anything that sold out because of this order is on sale again.
      await tx.product.updateMany({
        where: { id: { in: order.items.map((item) => item.productId) }, status: ProductStatus.OUT_OF_STOCK, stock: { gt: 0 } },
        data: { status: ProductStatus.PUBLISHED },
      });
    }

    await recordOrderEvent(tx, {
      orderId,
      type: OrderEventType.CANCELLED,
      actor: OrderEventActor.BUYER,
    });

    return tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: { items: true },
    });
  });

  // Only sellers of a paid order have anything to stop working on.
  if (order.status !== OrderStatus.PENDING) notifyOrderCancelledByBuyer(orderId);

  return cancelled;
};

export const getSellerOrdersService = async (
  userId: string,
  page: number,
  limit: number,
  status?: OrderItemStatus
) => {
  const store = await getSellerStore(userId);
  const skip = (page - 1) * limit;

  const itemFilter: any = { product: { storeId: store.id } };
  if (status) itemFilter.status = status;

  const where = {
    status: { not: OrderStatus.PENDING },
    // Cancelled by Nestly before the seller ever saw it (sold out).
    cancelReason: null,
    items: { some: itemFilter },
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } }, // no email (Privacy Policy)
        address: { select: SELLER_ADDRESS_SELECT },
        // How this seller's items reach the buyer. Never includes the
        // buyer's delivery code.
        shipping: {
          where: { storeId: store.id },
          select: { type: true, optionName: true, fee: true, eta: true, pickupAddress: true, vehicle: true },
        },
        // Only the note the buyer left for this store.
        sellerNotes: { where: { storeId: store.id }, select: { note: true } },
        items: {
          where: { product: { storeId: store.id } },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                status: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map((order) => forSeller({ ...order, items: order.items.map(asOrdered) })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

// Where the seller delivers to - never the address's phone or the buyer's
// email; the number to call is order.deliveryPhone (see forSeller).
const SELLER_ADDRESS_SELECT = {
  fullName: true,
  address: true,
  city: true,
  state: true,
  country: true,
  postalCode: true,
  // The buyer's map pin - "Open in Google Maps" for delivering.
  latitude: true,
  longitude: true,
} as const;

// The delivery phone is for delivering: sellers only get it for a delivery
// (not pickup) while some of their items are still on the way.
const forSeller = <T extends { deliveryPhone: string | null; shipping: { type: string }[]; items: { status: OrderItemStatus }[] }>(
  order: T,
) => {
  const delivering =
    order.shipping[0]?.type === "DELIVERY" &&
    order.items.some((item) => item.status !== OrderItemStatus.DELIVERED && item.status !== OrderItemStatus.CANCELLED);
  return { ...order, deliveryPhone: delivering ? order.deliveryPhone : null };
};

export const getSellerOrderByIdService = async (
  userId: string,
  orderId: string
) => {
  const store = await getSellerStore(userId);

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      items: { some: { product: { storeId: store.id } } },
    },
    include: {
      user: { select: { id: true, name: true } }, // no email (Privacy Policy)
      address: { select: SELLER_ADDRESS_SELECT },
      // How this seller's items reach the buyer. Never includes the
      // buyer's delivery code.
      shipping: {
        where: { storeId: store.id },
        select: { type: true, optionName: true, fee: true, eta: true, pickupAddress: true, vehicle: true },
      },
      // Only the note the buyer left for this store.
      sellerNotes: { where: { storeId: store.id }, select: { note: true } },

      items: {
        where: { product: { storeId: store.id } },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              status: true,
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  return forSeller({ ...order, items: order.items.map(asOrdered) });
};

export const updateOrderItemStatusService = async (
  userId: string,
  orderItemId: string,
  status: OrderItemStatus,
  deliveryCode?: string
) => {
  const store = await getSellerStore(userId);

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { product: true, order: true },
  });

  if (!item) {
    throw new AppError("Order item not found.", 404);
  }

  if (item.product.storeId !== store.id) {
    throw new AppError(
      "You are not authorized to update this item.",
      403
    );
  }

  if (item.order.status === OrderStatus.PENDING) {
    throw new AppError(
      "This order has not been paid for yet.",
      400
    );
  }

  if (item.status === OrderItemStatus.CANCELLED) {
    throw new AppError("This item has been cancelled.", 400);
  }

  if (status === OrderItemStatus.CANCELLED && item.status === OrderItemStatus.DELIVERED) {
    throw new AppError(
      "Delivered items can't be cancelled - the buyer can request a return instead.",
      400
    );
  }

  if (
    status !== OrderItemStatus.CANCELLED &&
    ITEM_STATUS_RANK[status] <= ITEM_STATUS_RANK[item.status]
  ) {
    throw new AppError(
      "Cannot move an order item's status backward.",
      400
    );
  }

  // Delivery code check: a correct code proves handover, so the item is
  // delivered and confirmed in one step. No code = delivered, awaiting the
  // buyer's confirmation (or auto-confirm).
  let confirmedWithCode = false;

  if (status === OrderItemStatus.DELIVERED && deliveryCode) {
    const shipment = await prisma.orderShipping.findUnique({
      where: { orderId_storeId: { orderId: item.orderId, storeId: store.id } },
    });

    if (!shipment?.deliveryCode) {
      throw new AppError(
        "This order has no delivery code. Mark it delivered without one and the buyer will be asked to confirm.",
        400
      );
    }

    if (shipment.deliveryCodeAttempts >= MAX_DELIVERY_CODE_ATTEMPTS) {
      throw new AppError(
        "Too many wrong codes - the delivery code is locked. Mark it delivered without a code and the buyer will be asked to confirm.",
        400
      );
    }

    if (shipment.deliveryCode !== deliveryCode) {
      const updated = await prisma.orderShipping.update({
        where: { id: shipment.id },
        data: { deliveryCodeAttempts: { increment: 1 } },
      });
      const left = MAX_DELIVERY_CODE_ATTEMPTS - updated.deliveryCodeAttempts;

      throw new AppError(
        left > 0
          ? `That code doesn't match. ${left} attempt${left === 1 ? "" : "s"} left.`
          : "That code doesn't match and the delivery code is now locked. Mark it delivered without a code and the buyer will be asked to confirm.",
        400
      );
    }

    confirmedWithCode = true;
  }

  const now = new Date();

  const order = await prisma.$transaction(async (tx) => {
    await tx.orderItem.update({
      where: { id: orderItemId },
      data: {
        status,
        ...(status === OrderItemStatus.SHIPPED && { shippedAt: now }),
        ...(status === OrderItemStatus.DELIVERED && {
          deliveredAt: now,
          ...(confirmedWithCode && {
            deliveryConfirmedAt: now,
            deliveryConfirmedBy: DeliveryConfirmation.CODE,
          }),
        }),
      },
    });

    await recordOrderEvent(tx, {
      orderId: item.orderId,
      orderItemId,
      type: status as OrderEventType,
      actor: OrderEventActor.SELLER,
      note: confirmedWithCode ? "Confirmed with delivery code" : undefined,
    });

    if (confirmedWithCode) {
      await recordOrderEvent(tx, {
        orderId: item.orderId,
        orderItemId,
        type: OrderEventType.CONFIRMED,
        actor: OrderEventActor.SELLER,
        note: "Delivery code",
      });
    }

    const allItems = await tx.orderItem.findMany({
      where: { orderId: item.orderId },
      select: { status: true },
    });

    return tx.order.update({
      where: { id: item.orderId },
      data: { status: computeOrderStatus(allItems) },
      include: { items: true },
    });
  });

  notifyItemStatusChanged(orderItemId, status, confirmedWithCode);

  return order;
};

export const confirmDeliveryService = async (
  userId: string,
  orderItemId: string
) => {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: { select: { userId: true } } },
  });

  if (!item || item.order.userId !== userId) {
    throw new AppError("Order item not found.", 404);
  }

  if (item.status !== OrderItemStatus.DELIVERED) {
    throw new AppError(
      "You can only confirm items the seller has marked as delivered.",
      400
    );
  }

  if (item.deliveryConfirmedAt) {
    throw new AppError("Delivery is already confirmed.", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const confirmed = await tx.orderItem.update({
      where: { id: orderItemId },
      data: {
        deliveryConfirmedAt: new Date(),
        deliveryConfirmedBy: DeliveryConfirmation.BUYER,
      },
    });

    await recordOrderEvent(tx, {
      orderId: item.orderId,
      orderItemId,
      type: OrderEventType.CONFIRMED,
      actor: OrderEventActor.BUYER,
    });

    return confirmed;
  });

  notifyDeliveryConfirmed(orderItemId, "BUYER");

  return withDeliveryState(updated);
};

// Confirms items the seller marked delivered that the buyer hasn't
// responded to within AUTO_CONFIRM_DAYS - unless the buyer has an open
// return request on it, which means they're disputing it.
export const autoConfirmDeliveriesService = async () => {
  const due = await prisma.orderItem.findMany({
    where: {
      status: OrderItemStatus.DELIVERED,
      deliveryConfirmedAt: null,
      deliveredAt: { lte: autoConfirmCutoff() },
      returnRequests: {
        none: {
          status: { in: [ReturnRequestStatus.REQUESTED, ReturnRequestStatus.APPROVED] },
        },
      },
    },
    select: { id: true, orderId: true },
    take: 200,
  });

  for (const item of due) {
    // Guarded update so a buyer confirming at the same moment wins cleanly.
    const { count } = await prisma.orderItem.updateMany({
      where: { id: item.id, deliveryConfirmedAt: null },
      data: { deliveryConfirmedAt: new Date(), deliveryConfirmedBy: DeliveryConfirmation.AUTO },
    });
    if (count === 0) continue;

    await recordOrderEvent(prisma, {
      orderId: item.orderId,
      orderItemId: item.id,
      type: OrderEventType.CONFIRMED,
      actor: OrderEventActor.SYSTEM,
      note: "Auto-confirmed",
    });

    notifyDeliveryConfirmed(item.id, "AUTO");
  }

  return due.length;
};

export const updateOrderTrackingNumberService = async (
  userId: string,
  orderId: string,
  trackingNumber: string
) => {
  const store = await getSellerStore(userId);

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      items: { some: { product: { storeId: store.id } } },
    },
  });

  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { trackingNumber },
    omit: { deliveryPhone: true },
  });
};
