import { OrderStatus, OrderItemStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { getSellerStore } from "../seller/seller.utils";

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

// Derived from current status only - there's no per-transition history table,
// so only the "created" and "current" steps have real timestamps.
const buildOrderTimeline = (order: {
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}) => {
  if (order.status === OrderStatus.CANCELLED) {
    return [
      {
        step: OrderStatus.PENDING,
        completed: true,
        current: false,
        at: order.createdAt,
      },
      {
        step: OrderStatus.CANCELLED,
        completed: true,
        current: true,
        at: order.updatedAt,
      },
    ];
  }

  const currentIndex = ORDER_STEPS.indexOf(order.status);

  return ORDER_STEPS.map((step, index) => ({
    step,
    completed: index <= currentIndex,
    current: index === currentIndex,
    at:
      index === 0
        ? order.createdAt
        : index === currentIndex
        ? order.updatedAt
        : null,
  }));
};

const CUSTOMER_ORDER_INCLUDE = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          title: true,
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
  shipping: true,
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
    orders,
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

  return { ...order, timeline: buildOrderTimeline(order) };
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

  return prisma.$transaction(async (tx) => {
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
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: { items: true },
    });
  });
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
    items: { some: itemFilter },
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          where: { product: { storeId: store.id } },
          include: {
            product: {
              select: {
                id: true,
                title: true,
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
    orders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
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
      user: { select: { id: true, name: true, email: true } },
      address: true,
      items: {
        where: { product: { storeId: store.id } },
        include: {
          product: {
            select: {
              id: true,
              title: true,
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

  return order;
};

export const updateOrderItemStatusService = async (
  userId: string,
  orderItemId: string,
  status: OrderItemStatus
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

  if (
    status !== OrderItemStatus.CANCELLED &&
    ITEM_STATUS_RANK[status] <= ITEM_STATUS_RANK[item.status]
  ) {
    throw new AppError(
      "Cannot move an order item's status backward.",
      400
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.orderItem.update({
      where: { id: orderItemId },
      data: { status },
    });

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
  });
};
