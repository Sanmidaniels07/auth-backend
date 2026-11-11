import {
  OrderEventActor,
  OrderEventType,
  OrderItemStatus,
  OrderRefundStatus,
  Prisma,
  ReturnReason,
  ReturnRequestStatus,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { refundPaystackTransaction } from "../../utils/paystack";
import { getSellerStore } from "../seller/seller.utils";
import { asOrdered } from "../../utils/orderItemSnapshot";
import { recordOrderEvent, returnWindowEndsAt, returnWindowLabel } from "../order/order-delivery";
import { OPEN_RETURN_STATUSES } from "../../utils/returnStatuses";
import { notifyReturnEvent } from "./return-notifications";
import { BuyerReturnActionInput, CreateReturnRequestInput, DecideReturnInput, SellerReturnResponseInput } from "./return-request.validation";

// Nestly's returns process - kept simple on purpose:
//   1. The buyer reports a problem within the return window (3 days, 24
//      hours for perishables). The seller's payout for that order is held.
//   2. The seller answers by a deadline (48 hours, 24 for perishables):
//      refund the buyer, send a replacement, or disagree.
//   3. No answer in time, a disagreement, or a problem with the
//      replacement goes to Nestly, who decides: refund, or close in the
//      seller's favour.
//   The buyer can choose to keep the item at any point before it's decided.
//   No partial refunds - a refund is the item's full price (what the buyer
//   paid for it), plus the delivery fee when nothing from that seller was kept.

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  DAMAGED: "Damaged",
  SPOILED: "Spoiled or expired",
  WRONG_ITEM: "Wrong item",
  NOT_AS_DESCRIBED: "Not as described",
  FAULTY: "Faulty",
  NOT_RECEIVED: "Not received",
};

/** How long the seller has to answer a report. */
export const SELLER_RESPONSE_HOURS = 48;
export const PERISHABLE_SELLER_RESPONSE_HOURS = 24;
/** A replacement nobody confirms or complains about is taken as received after this. */
export const REPLACEMENT_CONFIRM_DAYS = 7;

const HOUR_MS = 60 * 60 * 1000;
const kobo = (naira: number) => Math.round(naira * 100);

const REQUEST_INCLUDE = {
  orderItem: {
    include: {
      product: { select: { id: true, title: true, category: { select: { isPerishable: true } } } },
    },
  },
} satisfies Prisma.ReturnRequestInclude;

const view = <T extends { orderItem: Parameters<typeof asOrdered>[0] | null }>(entry: T) => ({
  ...entry,
  orderItem: entry.orderItem && asOrdered(entry.orderItem),
});

// ---- Opening a report ------------------------------------------------------

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
    throw new AppError("You can only report a problem with delivered items.", 400);
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

  const earlier = await prisma.returnRequest.findFirst({
    where: { orderItemId, status: { in: [...OPEN_RETURN_STATUSES, ReturnRequestStatus.REFUNDED] } },
    select: { status: true },
  });
  if (earlier?.status === ReturnRequestStatus.REFUNDED) {
    throw new AppError("This item has already been refunded.", 400);
  }
  if (earlier) {
    throw new AppError("A report is already in progress for this item.", 400);
  }

  const sellerRespondBy = new Date(Date.now() + (perishable ? PERISHABLE_SELLER_RESPONSE_HOURS : SELLER_RESPONSE_HOURS) * HOUR_MS);

  const returnRequest = await prisma.$transaction(async (tx) => {
    const created = await tx.returnRequest.create({
      data: { orderId: item.orderId, orderItemId, userId, reasonType, reason, photos, sellerRespondBy },
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

  notifyReturnEvent(returnRequest.id, "OPENED");
  return returnRequest;
};

// ---- Refunds -----------------------------------------------------------------

/**
 * Moves a report to REFUNDED (only from one of `from`, so two clicks can't
 * refund twice) and sends the refund. The amount is what the buyer paid
 * for the item (its share of any coupon taken off), plus the delivery fee
 * when this was the last item they kept from that seller. When the money
 * is still with Nestly (held or manual-ledger orders) it goes back through
 * Paystack; for split orders the seller already has it, so admins are asked
 * to refund by hand.
 */
const refundRequest = async (
  returnRequestId: string,
  from: ReturnRequestStatus[],
  data: Prisma.ReturnRequestUpdateManyMutationInput
) => {
  const request = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    select: {
      orderItem: {
        select: {
          id: true,
          totalPrice: true,
          autoPaidViaSplit: true,
          product: { select: { storeId: true } },
          order: {
            select: {
              paymentReference: true,
              subtotal: true,
              discountAmount: true,
              items: {
                select: {
                  id: true,
                  status: true,
                  product: { select: { storeId: true } },
                  returnRequests: { select: { status: true } },
                },
              },
              shipping: { select: { storeId: true, fee: true, paidViaSplit: true, heldForPayout: true, payoutId: true } },
            },
          },
        },
      },
    },
  });
  const item = request?.orderItem;
  if (!item) throw new AppError("Return request not found.", 404);

  const { order } = item;
  const storeId = item.product.storeId;
  const unit = order.shipping.find((s) => s.storeId === storeId);

  const couponShare = order.subtotal > 0 ? 1 - order.discountAmount / order.subtotal : 1;
  const othersKept = order.items.filter(
    (other) =>
      other.id !== item.id &&
      other.product.storeId === storeId &&
      other.status !== OrderItemStatus.CANCELLED &&
      !other.returnRequests.some((r) => r.status === ReturnRequestStatus.REFUNDED)
  );
  const refundAmount = Math.round((item.totalPrice * couponShare + (othersKept.length === 0 ? unit?.fee ?? 0 : 0)) * 100) / 100;

  // Still with Nestly: not split at checkout, and (for held orders) not paid out yet.
  const nestlyHasIt = !!order.paymentReference && !item.autoPaidViaSplit && !unit?.paidViaSplit && !(unit?.heldForPayout && unit.payoutId);

  const moved = await prisma.returnRequest.updateMany({
    where: { id: returnRequestId, status: { in: from } },
    data: {
      ...data,
      status: ReturnRequestStatus.REFUNDED,
      refundAmount,
      refundStatus: nestlyHasIt ? OrderRefundStatus.REQUESTED : OrderRefundStatus.FAILED,
    },
  });
  if (moved.count === 0) throw new AppError("This report was already answered.", 409);

  if (!nestlyHasIt) {
    notifyReturnEvent(returnRequestId, "REFUND_MANUAL");
    return;
  }

  try {
    await refundPaystackTransaction(order.paymentReference!, kobo(refundAmount));
    notifyReturnEvent(returnRequestId, "REFUNDED");
  } catch (error) {
    console.error(`Refund for return request ${returnRequestId} failed:`, error);
    await prisma.returnRequest.update({ where: { id: returnRequestId }, data: { refundStatus: OrderRefundStatus.FAILED } });
    notifyReturnEvent(returnRequestId, "REFUND_MANUAL");
  }
};

// ---- Seller ------------------------------------------------------------------

const sellerRequest = async (userId: string, returnRequestId: string) => {
  const store = await getSellerStore(userId);
  const request = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: { orderItem: { select: { product: { select: { storeId: true } } } } },
  });
  if (!request || request.orderItem?.product.storeId !== store.id) {
    throw new AppError("Return request not found.", 404);
  }
  return request;
};

/** The seller's answer: refund the buyer, send a replacement, or disagree (Nestly then decides). */
export const respondToReturnRequestService = async (userId: string, returnRequestId: string, input: SellerReturnResponseInput) => {
  await sellerRequest(userId, returnRequestId);
  const answerable = [ReturnRequestStatus.REQUESTED, ReturnRequestStatus.APPROVED];
  const note = input.note?.trim() || null;
  const answered = { sellerResponse: note, sellerRespondedAt: new Date() };

  if (input.action === "REFUND") {
    await refundRequest(returnRequestId, answerable, { ...answered, resolvedAt: new Date() });
  } else {
    const replacement = input.action === "REPLACE";
    const moved = await prisma.returnRequest.updateMany({
      where: { id: returnRequestId, status: { in: answerable } },
      data: replacement
        ? { ...answered, status: ReturnRequestStatus.REPLACEMENT }
        : { ...answered, status: ReturnRequestStatus.DISPUTED, escalatedAt: new Date() },
    });
    if (moved.count === 0) throw new AppError("This report was already answered.", 409);
    notifyReturnEvent(returnRequestId, replacement ? "REPLACEMENT" : "SELLER_DISAGREED");
  }

  return prisma.returnRequest.findUnique({ where: { id: returnRequestId } });
};

// ---- Buyer -------------------------------------------------------------------

/** The buyer keeps the item, confirms the replacement, or reports a problem with it. */
export const buyerReturnActionService = async (userId: string, returnRequestId: string, input: BuyerReturnActionInput) => {
  const request = await prisma.returnRequest.findUnique({ where: { id: returnRequestId }, select: { userId: true } });
  if (!request || request.userId !== userId) throw new AppError("Return request not found.", 404);

  const now = new Date();
  const transitions = {
    KEEP: {
      from: [ReturnRequestStatus.REQUESTED, ReturnRequestStatus.APPROVED, ReturnRequestStatus.DISPUTED],
      data: { status: ReturnRequestStatus.WITHDRAWN, resolvedAt: now },
      event: "KEPT" as const,
    },
    REPLACEMENT_RECEIVED: {
      from: [ReturnRequestStatus.REPLACEMENT],
      data: { status: ReturnRequestStatus.REPLACED, resolvedAt: now },
      event: "REPLACED" as const,
    },
    REPLACEMENT_PROBLEM: {
      from: [ReturnRequestStatus.REPLACEMENT],
      data: {
        status: ReturnRequestStatus.DISPUTED,
        escalatedAt: now,
        // Keep the original report; add what's wrong with the replacement.
        reason: undefined as string | undefined,
      },
      event: "REPLACEMENT_PROBLEM" as const,
    },
  }[input.action];

  if (input.action === "REPLACEMENT_PROBLEM") {
    const current = await prisma.returnRequest.findUnique({ where: { id: returnRequestId }, select: { reason: true } });
    transitions.data.reason = `${current?.reason ?? ""}\n\nReplacement: ${input.note?.trim()}`.trim().slice(0, 2000);
  }

  const moved = await prisma.returnRequest.updateMany({
    where: { id: returnRequestId, status: { in: transitions.from } },
    data: transitions.data,
  });
  if (moved.count === 0) throw new AppError("This report can't be changed now.", 409);

  notifyReturnEvent(returnRequestId, transitions.event);
  return prisma.returnRequest.findUnique({ where: { id: returnRequestId } });
};

// ---- Nestly (admin) --------------------------------------------------------------

/** Nestly's decision on a report: refund the buyer, or close it in the seller's favour. */
export const decideReturnRequestService = async (adminUserId: string, returnRequestId: string, input: DecideReturnInput) => {
  const exists = await prisma.returnRequest.findUnique({ where: { id: returnRequestId }, select: { id: true } });
  if (!exists) throw new AppError("Return request not found.", 404);

  const decided = { resolvedAt: new Date(), resolvedById: adminUserId, resolutionNote: input.note?.trim() || null };

  if (input.decision === "REFUND") {
    await refundRequest(returnRequestId, OPEN_RETURN_STATUSES, decided);
  } else {
    const moved = await prisma.returnRequest.updateMany({
      where: { id: returnRequestId, status: { in: OPEN_RETURN_STATUSES } },
      data: { ...decided, status: ReturnRequestStatus.REJECTED },
    });
    if (moved.count === 0) throw new AppError("This report is already closed.", 409);
    notifyReturnEvent(returnRequestId, "REJECTED");
  }

  return prisma.returnRequest.findUnique({ where: { id: returnRequestId } });
};

/** Admin: reports waiting on Nestly (disputed), then open ones, oldest first. Includes refunds to send by hand. */
export const listAdminReturnRequestsService = async (page: number, limit: number, status?: ReturnRequestStatus) => {
  const where: Prisma.ReturnRequestWhereInput = status
    ? { status }
    : {
        OR: [
          { status: { in: OPEN_RETURN_STATUSES } },
          { status: ReturnRequestStatus.REFUNDED, refundStatus: OrderRefundStatus.FAILED },
        ],
      };

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ escalatedAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItem: {
          include: {
            product: { select: { id: true, title: true, store: { select: { id: true, name: true, slug: true } } } },
          },
        },
        order: { select: { paymentReference: true } },
      },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return { returns: returns.map(view), total, page, limit, totalPages: Math.ceil(total / limit) };
};

// ---- Deadlines (job) ----------------------------------------------------------

/**
 * Sellers who didn't answer in time: the report goes to Nestly. Replacements
 * nobody confirmed or complained about in REPLACEMENT_CONFIRM_DAYS: taken as
 * received. Guarded updates, so it's safe to run anywhere.
 */
export const processReturnDeadlinesService = async () => {
  const now = new Date();

  const overdue = await prisma.returnRequest.findMany({
    where: { status: ReturnRequestStatus.REQUESTED, sellerRespondBy: { lt: now } },
    select: { id: true },
    take: 200,
  });
  let escalated = 0;
  for (const { id } of overdue) {
    const moved = await prisma.returnRequest.updateMany({
      where: { id, status: ReturnRequestStatus.REQUESTED },
      data: { status: ReturnRequestStatus.DISPUTED, escalatedAt: now },
    });
    if (moved.count > 0) {
      escalated += 1;
      notifyReturnEvent(id, "ESCALATED");
    }
  }

  const settled = await prisma.returnRequest.findMany({
    where: {
      status: ReturnRequestStatus.REPLACEMENT,
      sellerRespondedAt: { lt: new Date(now.getTime() - REPLACEMENT_CONFIRM_DAYS * 24 * HOUR_MS) },
    },
    select: { id: true },
    take: 200,
  });
  let replaced = 0;
  for (const { id } of settled) {
    const moved = await prisma.returnRequest.updateMany({
      where: { id, status: ReturnRequestStatus.REPLACEMENT },
      data: { status: ReturnRequestStatus.REPLACED, resolvedAt: now },
    });
    if (moved.count > 0) {
      replaced += 1;
      notifyReturnEvent(id, "REPLACED");
    }
  }

  return { escalated, replaced };
};

// ---- Lists ---------------------------------------------------------------------

export const getCustomerReturnRequestsService = async (userId: string, page: number, limit: number, status?: ReturnRequestStatus) => {
  const where: Prisma.ReturnRequestWhereInput = { userId, ...(status ? { status } : {}) };

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { ...REQUEST_INCLUDE, orderItem: { include: { product: { select: { id: true, title: true, store: { select: { name: true } } } } } } },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return { returns: returns.map(view), total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getSellerReturnRequestsService = async (userId: string, page: number, limit: number, status?: ReturnRequestStatus) => {
  const store = await getSellerStore(userId);
  const where: Prisma.ReturnRequestWhereInput = {
    orderItem: { product: { storeId: store.id } },
    ...(status ? { status } : {}),
  };

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } }, // no email (Privacy Policy)
        ...REQUEST_INCLUDE,
      },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return { returns: returns.map(view), total, page, limit, totalPages: Math.ceil(total / limit) };
};
