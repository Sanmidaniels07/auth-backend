import { OrderItemStatus, ReturnRequestStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { getSellerStore } from "../seller/seller.utils";

const ALLOWED_TRANSITIONS: Record<
  ReturnRequestStatus,
  ReturnRequestStatus[]
> = {
  REQUESTED: [
    ReturnRequestStatus.APPROVED,
    ReturnRequestStatus.REJECTED,
  ],
  APPROVED: [ReturnRequestStatus.REFUNDED],
  REJECTED: [],
  REFUNDED: [],
};

export const createReturnRequestService = async (
  userId: string,
  orderItemId: string,
  reason: string
) => {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true },
  });

  if (!item || item.order.userId !== userId) {
    throw new AppError("Order item not found.", 404);
  }

  if (item.status !== OrderItemStatus.DELIVERED) {
    throw new AppError(
      "You can only request a return for delivered items.",
      400
    );
  }

  const existing = await prisma.returnRequest.findFirst({
    where: {
      orderItemId,
      status: {
        in: [
          ReturnRequestStatus.REQUESTED,
          ReturnRequestStatus.APPROVED,
        ],
      },
    },
  });

  if (existing) {
    throw new AppError(
      "A return request is already in progress for this item.",
      400
    );
  }

  return prisma.returnRequest.create({
    data: {
      orderId: item.orderId,
      orderItemId,
      userId,
      reason,
    },
  });
};

export const getCustomerReturnRequestsService = async (
  userId: string,
  page: number,
  limit: number,
  status?: ReturnRequestStatus
) => {
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (status) where.status = status;

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        orderItem: {
          include: {
            product: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return {
    returns,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getSellerReturnRequestsService = async (
  userId: string,
  page: number,
  limit: number,
  status?: ReturnRequestStatus
) => {
  const store = await getSellerStore(userId);
  const skip = (page - 1) * limit;

  const where: any = {
    orderItem: { product: { storeId: store.id } },
  };
  if (status) where.status = status;

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        orderItem: {
          include: {
            product: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return {
    returns,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const updateReturnRequestStatusService = async (
  userId: string,
  returnRequestId: string,
  status: ReturnRequestStatus
) => {
  const store = await getSellerStore(userId);

  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: {
      orderItem: { include: { product: true } },
    },
  });

  if (!returnRequest || !returnRequest.orderItem) {
    throw new AppError("Return request not found.", 404);
  }

  if (returnRequest.orderItem.product.storeId !== store.id) {
    throw new AppError(
      "You are not authorized to manage this return request.",
      403
    );
  }

  if (
    !ALLOWED_TRANSITIONS[returnRequest.status].includes(
      status
    )
  ) {
    throw new AppError(
      `Cannot move a return request from ${returnRequest.status} to ${status}.`,
      400
    );
  }

  return prisma.returnRequest.update({
    where: { id: returnRequestId },
    data: { status },
  });
};
