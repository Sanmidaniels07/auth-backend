import {
  OrderEventActor,
  OrderEventType,
  OrderItemStatus,
  ReturnReason,
  ReturnRequestStatus,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { getSellerStore } from "../seller/seller.utils";
import { asOrdered } from "../../utils/orderItemSnapshot";
import { recordOrderEvent, returnWindowEndsAt, returnWindowLabel } from "../order/order-delivery";
import { CreateReturnRequestInput } from "./return-request.validation";

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  DAMAGED: "Damaged",
  SPOILED: "Spoiled or expired",
  WRONG_ITEM: "Wrong item",
  NOT_AS_DESCRIBED: "Not as described",
  FAULTY: "Faulty",
  NOT_RECEIVED: "Not received",
};
import { notifyProblemReported, notifyReturnStatusChanged } from "../order/order-notifications";

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

export const createReturnRequestService = async (userId: string, input: CreateReturnRequestInput) => {
  const { orderItemId, reasonType, reason } = input;
  const photos = input.photos ?? [];
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true, product: { select: { category: { select: { isPerishable: true } } } } },
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

  const perishable = item.product.category.isPerishable;

  // The window opens when delivery is confirmed: 3 days, or 24 hours for
  // perishables. Delivered-but-unconfirmed items can always be reported -
  // that is how a buyer disputes delivery.
  if (item.deliveryConfirmedAt && new Date() > returnWindowEndsAt(item.deliveryConfirmedAt, perishable)) {
    throw new AppError(
      `Problems with this item had to be reported within ${returnWindowLabel(item.deliveryConfirmedAt, perishable)} of delivery.`,
      400
    );
  }

  // Perishables aren't sent back, so a photo is the evidence.
  if (perishable && reasonType !== ReturnReason.NOT_RECEIVED && photos.length === 0) {
    throw new AppError("Add at least one photo showing the problem - food and other perishables aren't sent back.", 400);
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

  const returnRequest = await prisma.$transaction(async (tx) => {
    const created = await tx.returnRequest.create({
      data: {
        orderId: item.orderId,
        orderItemId,
        userId,
        reasonType,
        reason,
        photos,
      },
    });

    await recordOrderEvent(tx, {
      orderId: item.orderId,
      orderItemId,
      type: OrderEventType.PROBLEM_REPORTED,
      actor: OrderEventActor.BUYER,
      note: `${RETURN_REASON_LABEL[reasonType]}: ${reason}`.slice(0, 200),
    });

    return created;
  });

  notifyProblemReported(orderItemId, `${RETURN_REASON_LABEL[reasonType]} - ${reason}${photos.length ? ` (${photos.length} photo${photos.length === 1 ? "" : "s"})` : ""}`);

  return returnRequest;
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
    returns: returns.map((entry) => ({ ...entry, orderItem: entry.orderItem && asOrdered(entry.orderItem) })),
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
          select: { id: true, name: true }, // no email (Privacy Policy)
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
    returns: returns.map((entry) => ({ ...entry, orderItem: entry.orderItem && asOrdered(entry.orderItem) })),
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

  const updated = await prisma.returnRequest.update({
    where: { id: returnRequestId },
    data: { status },
  });

  notifyReturnStatusChanged(returnRequest.orderItemId as string, status);

  return updated;
};
