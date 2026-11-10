import crypto from "crypto";
import {
  GiftStatus,
  OrderEventActor,
  OrderEventType,
  OrderItemStatus,
  OrderRefundStatus,
  OrderStatus,
  Prisma,
  ProductStatus,
  ShippingOptionType,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { initializePaystackTransaction, refundPaystackTransaction } from "../../utils/paystack";
import { snapshotOf } from "../../utils/orderItemSnapshot";
import { unitPriceOf, variationLabel } from "../../utils/productOptions";
import { referralCommission, referralRewardApplies } from "../../utils/referral";
import { STOCK_HOLD_TX, assertStockAvailable } from "../../utils/stockHold";
import { VEHICLE_LABEL, canCarry } from "../../utils/deliveryVehicle";
import { isBlockedEitherWay } from "../block/block.service";
import { storePickupAddress } from "../store/store.service";
import { generateDeliveryCode, recordOrderEvent } from "../order/order-delivery";
import { notifyGiftClaimed, notifyGiftClosed } from "./gift-notifications";
import { ClaimGiftInput, SendGiftInput } from "./gift.validation";

// Gift links. The sender pays for one item and picks the seller's delivery
// zone the recipient lives in (or a pickup point) - not their street
// address. The recipient opens the link, signs in and adds their address,
// and only then does the seller get the order. The money stays in Nestly's
// account (no Paystack split) until then, so a declined, cancelled or
// unclaimed gift is refunded in full with nothing to claw back.

const NAIRA_TO_KOBO = 100;

// No 0/O, 1/l/I - codes get read out and typed.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;

const generateCode = () =>
  Array.from(crypto.randomBytes(CODE_LENGTH), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");

const uniqueCode = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    if (!(await prisma.gift.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
  throw new AppError("Couldn't create the gift right now. Please try again.", 500);
};

const normalize = (value: string | null | undefined) => (value ?? "").toLowerCase().replace(/\s+state$/, "").trim();

// ---------------------------------------------------------------------------
// Send

/**
 * Starts a gift: creates the pending order (no address yet) and the Paystack
 * transaction. Payment is confirmed through the usual checkout verify /
 * webhook, which marks the gift SENT and tells the sender and recipient.
 */
export const sendGiftService = async (userId: string, data: SendGiftInput) => {
  const quantity = data.quantity ?? 1;

  const [user, product] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.product.findUnique({
      where: { id: data.productId },
      include: {
        images: true,
        specifications: true,
        category: true,
        options: true,
        variations: { where: { isArchived: false } },
        store: {
          include: {
            shippingOptions: { where: { isArchived: false } },
            seller: { select: { userId: true } },
          },
        },
      },
    }),
  ]);

  if (!user) throw new AppError("User not found.", 404);
  if (!product || product.status !== ProductStatus.PUBLISHED || product.store.isSuspended) {
    throw new AppError("This item isn't available to gift right now.", 404);
  }

  const { store } = product;
  if (store.seller.userId === userId) {
    throw new AppError("You can't send a gift from your own store.", 400);
  }

  // Products sold in options are gifted as one of their combinations.
  let variation: (typeof product.variations)[number] | null = null;
  if (product.variations.length > 0) {
    variation = product.variations.find((v) => v.id === data.variationId) ?? null;
    if (!variation || !variation.isActive) throw new AppError("Choose an option (size, colour...) for the gift.", 400);
  }
  const stock = variation ? variation.stock : product.stock;
  if (quantity > stock) {
    throw new AppError(stock > 0 ? `Only ${stock} left - lower the quantity.` : "This item has sold out.", 400);
  }

  // Someone on Nestly: they're told as soon as it's paid.
  let recipientId: string | null = null;
  if (data.recipientId) {
    if (data.recipientId === userId) throw new AppError("Choose someone else - gifts are for other people.", 400);
    const recipient = await prisma.user.findFirst({
      where: { id: data.recipientId, deletedAt: null },
      select: { id: true },
    });
    if (!recipient || (await isBlockedEitherWay(userId, recipient.id))) {
      throw new AppError("We couldn't find that person.", 404);
    }
    recipientId = recipient.id;
  }

  const option = store.shippingOptions.find((o) => o.id === data.shippingOptionId);
  if (!option) throw new AppError("That delivery option isn't available. Choose another.", 400);
  if (!canCarry(option, product.deliveryVehicle)) {
    throw new AppError(
      `"${option.name}" can't carry this item (it needs a ${VEHICLE_LABEL[product.deliveryVehicle]}). Choose another option.`,
      400
    );
  }
  const isPickup = option.type === ShippingOptionType.PICKUP;

  const commissionRate = referralRewardApplies(user, { id: store.id, sellerUserId: store.seller.userId })
    ? referralCommission(product.category.commissionRate)
    : product.category.commissionRate;

  const unitPrice = unitPriceOf(product, variation);
  const subtotal = unitPrice * quantity;
  const deliveryFee = option.fee;
  const total = subtotal + deliveryFee;
  const code = await uniqueCode();
  const reference = `NESTLY_${crypto.randomUUID().replace(/-/g, "")}`;

  // The unpaid order holds its stock while the sender pays (utils/stockHold).
  const order = await prisma.$transaction(async (tx) => {
    await assertStockAvailable(tx, userId, [
      { productId: product.id, variationId: variation?.id ?? null, quantity, title: product.title },
    ]);

    return tx.order.create({
      data: {
        userId,
        // The recipient adds their address when they claim it.
        addressId: null,
        status: OrderStatus.PENDING,
        subtotal,
        deliveryFee,
        tax: 0,
        total,
        paymentMethod: "PAYSTACK",
        paymentReference: reference,
        source: data.source,
        items: {
          create: {
            productId: product.id,
            quantity,
            unitPrice,
            totalPrice: subtotal,
            commissionRate,
            referralReward: commissionRate !== product.category.commissionRate,
            // Held by Nestly until claimed, then paid out like any order.
            autoPaidViaSplit: false,
            ...snapshotOf(product),
            variationId: variation?.id ?? null,
            variantLabel: variation ? variationLabel(product.options, variation) : null,
          },
        },
        shipping: {
          create: {
            storeId: store.id,
            optionName: option.name,
            fee: option.fee,
            eta: option.eta,
            type: option.type,
            pickupAddress: isPickup ? option.pickupAddress ?? storePickupAddress(store) : null,
            vehicle: isPickup ? null : option.vehicle,
            deliveryCode: generateDeliveryCode(),
            paidViaSplit: false,
          },
        },
        gift: {
          create: {
            code,
            senderId: userId,
            recipientId,
            recipientName: data.recipientName,
            message: data.message || null,
            showPrice: data.showPrice ?? false,
            deliveryState: isPickup ? null : option.state,
            deliveryAreas: isPickup ? [] : option.areas,
          },
        },
      },
    });
  }, STOCK_HOLD_TX);

  // No split: the payment stays with Nestly until the gift is accepted.
  const paystack = await initializePaystackTransaction({
    email: user.email,
    amountKobo: Math.round(total * NAIRA_TO_KOBO),
    reference,
    callbackUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/gift/${code}` : undefined,
  });

  return {
    code,
    orderId: order.id,
    reference,
    accessCode: paystack.access_code,
    authorizationUrl: paystack.authorization_url,
    total,
  };
};

// ---------------------------------------------------------------------------
// View

const GIFT_INCLUDE = {
  sender: { select: { id: true, name: true, username: true, avatar: true } },
  recipient: { select: { id: true, name: true, username: true, avatar: true } },
  order: {
    select: {
      id: true,
      status: true,
      total: true,
      cancelReason: true,
      refundStatus: true,
      deliveryPhone: true,
      address: { select: { fullName: true, address: true, city: true, state: true } },
      shipping: {
        select: {
          type: true,
          optionName: true,
          fee: true,
          eta: true,
          pickupAddress: true,
          deliveryCode: true,
          store: { select: { name: true, slug: true, logo: true } },
        },
      },
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          status: true,
          productTitle: true,
          productImage: true,
          variantLabel: true,
          shippedAt: true,
          deliveredAt: true,
          deliveryConfirmedAt: true,
        },
      },
    },
  },
} satisfies Prisma.GiftInclude;

type GiftWithOrder = Prisma.GiftGetPayload<{ include: typeof GIFT_INCLUDE }>;

const findGift = async (code: string) => {
  const gift = await prisma.gift.findUnique({ where: { code }, include: GIFT_INCLUDE });
  if (!gift) throw new AppError("This gift link doesn't exist.", 404);
  return gift;
};

const isExpired = (gift: { status: GiftStatus; expiresAt: Date | null }) =>
  gift.status === GiftStatus.SENT && !!gift.expiresAt && gift.expiresAt <= new Date();

/** What the gift page shows - depends on who is looking. */
const viewOf = (gift: GiftWithOrder, viewerId?: string) => {
  const isSender = viewerId === gift.senderId;
  const isRecipient = !!viewerId && viewerId === gift.recipientId;
  const role = isSender ? "SENDER" : isRecipient ? "RECIPIENT" : "VIEWER";
  const item = gift.order.items[0];
  const shipping = gift.order.shipping[0];

  // Sold out just before payment (refunded), or never paid.
  const status =
    gift.order.status === OrderStatus.CANCELLED && gift.status !== GiftStatus.CLAIMED
      ? gift.status === GiftStatus.SENT || gift.status === GiftStatus.UNPAID
        ? GiftStatus.CANCELLED
        : gift.status
      : isExpired(gift)
        ? GiftStatus.EXPIRED
        : gift.status;

  // Anyone with an open link can accept it; a gift for someone on Nestly is
  // theirs alone. The sender can't accept their own gift.
  const meantForViewer = !gift.recipientId || isRecipient;
  const canClaim = status === GiftStatus.SENT && !!viewerId && !isSender && meantForViewer;

  return {
    code: gift.code,
    status,
    role,
    canClaim,
    // Signed in, but the gift is addressed to someone else on Nestly.
    forSomeoneElse: !!viewerId && !isSender && !meantForViewer,
    sender: gift.sender,
    recipientName: gift.recipient?.name ?? gift.recipientName,
    hasNamedRecipient: !!gift.recipientId,
    message: gift.message,
    showPrice: gift.showPrice,
    expiresAt: gift.expiresAt,
    claimedAt: gift.claimedAt,
    item: item
      ? {
          title: item.productTitle,
          image: item.productImage,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
          productId: item.productId,
          // Hidden from the recipient unless the sender chose to show it.
          unitPrice: gift.showPrice || isSender ? item.unitPrice : null,
        }
      : null,
    store: shipping?.store ?? null,
    delivery: shipping
      ? {
          type: shipping.type,
          optionName: shipping.optionName,
          eta: shipping.eta,
          pickupAddress: shipping.pickupAddress,
          state: gift.deliveryState,
          areas: gift.deliveryAreas,
        }
      : null,
    // The sender's receipt.
    payment: isSender ? { total: gift.order.total, orderId: gift.order.id, refundStatus: gift.order.refundStatus } : null,
    // After accepting, the recipient follows it and holds the delivery code.
    progress:
      isRecipient && gift.status === GiftStatus.CLAIMED && item
        ? {
            orderItemId: item.id,
            itemStatus: item.status,
            shippedAt: item.shippedAt,
            deliveredAt: item.deliveredAt,
            deliveryConfirmedAt: item.deliveryConfirmedAt,
            deliveryCode: shipping?.deliveryCode ?? null,
            deliverTo: gift.order.address,
            deliveryPhone: gift.order.deliveryPhone,
          }
        : null,
    // The sender sees how it's going, not where it's going.
    senderProgress:
      isSender && gift.status === GiftStatus.CLAIMED && item
        ? { itemStatus: item.status, shippedAt: item.shippedAt, deliveredAt: item.deliveredAt }
        : null,
  };
};

export const getGiftService = async (code: string, viewerId?: string) => {
  const gift = await findGift(code);

  // An unpaid gift isn't a gift yet - only the sender may look at it.
  if (gift.status === GiftStatus.UNPAID && gift.order.status === OrderStatus.PENDING && viewerId !== gift.senderId) {
    throw new AppError("This gift link doesn't exist.", 404);
  }

  return viewOf(gift, viewerId);
};

// ---------------------------------------------------------------------------
// Claim

/** The recipient accepts the gift and says where it should go. */
export const claimGiftService = async (userId: string, code: string, data: ClaimGiftInput) => {
  const gift = await findGift(code);
  const view = viewOf(gift, userId);

  if (gift.senderId === userId) throw new AppError("This is your gift - send the link to the person it's for.", 400);
  if (view.forSomeoneElse) throw new AppError(`This gift is for ${view.recipientName}.`, 403);
  if (view.status === GiftStatus.CLAIMED) throw new AppError("This gift has already been accepted.", 409);
  if (view.status !== GiftStatus.SENT) throw new AppError("This gift can't be accepted any more.", 400);
  if (gift.order.status !== OrderStatus.PAID) throw new AppError("This gift can't be accepted any more.", 400);

  const shipping = gift.order.shipping[0];
  const isPickup = shipping?.type === ShippingOptionType.PICKUP;

  let addressId: string | null = null;
  let deliveryPhone = data.deliveryPhone?.trim() || null;

  if (!isPickup) {
    if (!data.addressId) throw new AppError("Add the address where you'd like it delivered.", 400);
    const address = await prisma.address.findUnique({ where: { id: data.addressId } });
    if (!address || address.userId !== userId) throw new AppError("Address not found.", 404);

    // The sender paid for delivery within one zone - the address must be in it.
    if (gift.deliveryState && normalize(address.state) !== normalize(gift.deliveryState)) {
      throw new AppError(
        `${gift.sender.name} paid for delivery in ${gift.deliveryState}. Add a ${gift.deliveryState} address, or ask them to send it to your area.`,
        400
      );
    }
    addressId = address.id;
    deliveryPhone = deliveryPhone ?? address.phone;
  } else if (!deliveryPhone) {
    // The seller may need to reach the person collecting it.
    const fallback = await prisma.address.findFirst({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: { phone: true },
    });
    deliveryPhone = fallback?.phone ?? null;
  }

  const claimed = await prisma.$transaction(async (tx) => {
    // Only the first accept wins - two people opening an open link at once.
    const won = await tx.gift.updateMany({
      where: { id: gift.id, status: GiftStatus.SENT, expiresAt: { gt: new Date() } },
      data: { status: GiftStatus.CLAIMED, recipientId: userId, claimedAt: new Date() },
    });
    if (won.count === 0) return false;

    await tx.order.update({ where: { id: gift.order.id }, data: { addressId, deliveryPhone } });
    return true;
  });

  if (!claimed) throw new AppError("This gift can't be accepted any more.", 409);

  notifyGiftClaimed(gift.order.id);

  return getGiftService(code, userId);
};

// ---------------------------------------------------------------------------
// Decline, cancel, expire - all refund the sender

const CLOSE_REASON: Partial<Record<GiftStatus, string>> = {
  [GiftStatus.DECLINED]: "The gift was declined.",
  [GiftStatus.EXPIRED]: "The gift wasn't accepted in time.",
  [GiftStatus.CANCELLED]: "The sender cancelled the gift.",
};

/**
 * Ends a gift that hasn't been accepted: cancels the order, puts the stock
 * back and refunds the sender through Paystack (admins are told if Paystack
 * refuses). Only the first caller acts - safe against double clicks and the
 * expiry job running at the same moment.
 */
const closeGift = async (
  giftId: string,
  status: (typeof GiftStatus)["DECLINED" | "EXPIRED" | "CANCELLED"],
  actor: OrderEventActor
) => {
  const gift = await prisma.gift.findUniqueOrThrow({
    where: { id: giftId },
    include: { order: { include: { items: true } } },
  });
  const { order } = gift;

  const closed = await prisma.$transaction(async (tx) => {
    const won = await tx.gift.updateMany({
      where: { id: giftId, status: GiftStatus.SENT },
      data: { status, closedAt: new Date() },
    });
    if (won.count === 0) return false;

    await tx.orderItem.updateMany({ where: { orderId: order.id }, data: { status: OrderItemStatus.CANCELLED } });

    // Stock was taken when the payment went through - put it back.
    for (const item of order.items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      if (item.variationId) {
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    await tx.product.updateMany({
      where: {
        id: { in: order.items.map((item) => item.productId) },
        status: ProductStatus.OUT_OF_STOCK,
        stock: { gt: 0 },
      },
      data: { status: ProductStatus.PUBLISHED },
    });

    await recordOrderEvent(tx, { orderId: order.id, type: OrderEventType.CANCELLED, actor, note: CLOSE_REASON[status] });
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelReason: CLOSE_REASON[status],
        refundStatus: OrderRefundStatus.REQUESTED,
      },
    });
    return true;
  });

  if (!closed) return false;

  let refunded = true;
  try {
    if (!order.paymentReference) throw new Error("No payment reference");
    await refundPaystackTransaction(order.paymentReference);
  } catch (error) {
    refunded = false;
    console.error(`Automatic refund for gift ${gift.code} failed:`, error);
    await prisma.order.update({ where: { id: order.id }, data: { refundStatus: OrderRefundStatus.FAILED } });
  }

  notifyGiftClosed(order.id, status, refunded);
  return true;
};

/** The named recipient says no thanks - the sender is refunded. */
export const declineGiftService = async (userId: string, code: string) => {
  const gift = await findGift(code);
  // Open links can't be declined (anyone could) - they simply expire.
  if (gift.recipientId !== userId) throw new AppError("Only the person this gift is for can decline it.", 403);
  if (viewOf(gift, userId).status !== GiftStatus.SENT) throw new AppError("This gift can't be declined any more.", 400);

  if (!(await closeGift(gift.id, GiftStatus.DECLINED, OrderEventActor.BUYER))) {
    throw new AppError("This gift can't be declined any more.", 409);
  }
  return getGiftService(code, userId);
};

/** The sender changes their mind before it's accepted - refunded in full. */
export const cancelGiftService = async (userId: string, code: string) => {
  const gift = await findGift(code);
  if (gift.senderId !== userId) throw new AppError("This gift link doesn't exist.", 404);
  if (viewOf(gift, userId).status !== GiftStatus.SENT) {
    throw new AppError("This gift can't be cancelled - it has been accepted or has already ended.", 400);
  }

  if (!(await closeGift(gift.id, GiftStatus.CANCELLED, OrderEventActor.BUYER))) {
    throw new AppError("This gift can't be cancelled any more.", 409);
  }
  return getGiftService(code, userId);
};

/** Job: refunds gifts nobody accepted in time. Returns how many were closed. */
export const expireGiftsService = async (now: Date = new Date()) => {
  const due = await prisma.gift.findMany({
    where: { status: GiftStatus.SENT, expiresAt: { lte: now } },
    select: { id: true },
    take: 50,
  });

  let count = 0;
  for (const { id } of due) {
    if (await closeGift(id, GiftStatus.EXPIRED, OrderEventActor.SYSTEM).catch(() => false)) count++;
  }
  return count;
};

// ---------------------------------------------------------------------------
// Lists

export const listGiftsService = async (userId: string, box: "sent" | "received", page: number, limit: number) => {
  const where: Prisma.GiftWhereInput =
    box === "sent"
      ? { senderId: userId, status: { not: GiftStatus.UNPAID } }
      : { recipientId: userId, status: { not: GiftStatus.UNPAID } };

  const [gifts, total] = await Promise.all([
    prisma.gift.findMany({
      where,
      include: GIFT_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.gift.count({ where }),
  ]);

  return {
    gifts: gifts.map((gift) => viewOf(gift, userId)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
