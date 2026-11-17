import crypto from "crypto";
import { ContributionStatus, GroupGiftStatus, NotificationType, OrderStatus, Prisma, Role } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { initializePaystackTransaction, refundPaystackTransaction, verifyPaystackTransaction } from "../../utils/paystack";
import { assertWithinReviewLimit } from "../../utils/sellerReview";
import { isBlockedEitherWay } from "../block/block.service";
import { createNotificationService } from "../notification/notification.service";
import { finalizeOrderPayment } from "../checkout/checkout.service";
import { createGiftOrder, resolveGiftItem } from "../gift/gift.service";
import { StartGroupGiftInput, ContributeInput } from "./group-gift.validation";

// Chip in on a gift. Someone starts it for a friend (a listed product, the
// seller's delivery zone or pickup point, a deadline); friends each pay part
// of it. Nestly holds every contribution. The moment they reach the target
// a normal gift order is placed (gift/) - the recipient is told and claims
// it with their address, exactly like a gift one person paid for. If the
// deadline passes first, or the organiser calls it off, everyone is refunded.

export const MIN_CONTRIBUTION = 500;
// A started payment holds its share of what's left for this long, so two
// friends paying at once can't both pay "the rest".
const PENDING_HOLD_MS = 30 * 60 * 1000;
const REFERENCE_PREFIX = "NESTLY_CHIPIN_";
const NAIRA_TO_KOBO = 100;

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateCode = () => Array.from(crypto.randomBytes(9), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");

const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
const round = (value: number) => Math.round(value * 100) / 100;

export const isContributionReference = (reference: string) => reference.startsWith(REFERENCE_PREFIX);

const notify = (userId: string, title: string, message: string, code: string) =>
  createNotificationService(userId, title, message, NotificationType.SHOPPING, { type: "GROUP_GIFT", id: code }).catch((error) =>
    console.error("Group gift notification failed:", error)
  );

// ---------------------------------------------------------------------------
// Start

export const startGroupGiftService = async (userId: string, data: StartGroupGiftInput) => {
  const item = await resolveGiftItem(userId, {
    productId: data.productId,
    variationId: data.variationId,
    quantity: 1,
    shippingOptionId: data.shippingOptionId,
    recipientId: data.recipientId,
  });
  const target = round(item.unitPrice + item.option.fee);
  assertWithinReviewLimit(item.store, target);

  let code = generateCode();
  for (let i = 0; i < 4 && (await prisma.groupGift.findUnique({ where: { code }, select: { id: true } })); i++) code = generateCode();

  const groupGift = await prisma.groupGift.create({
    data: {
      code,
      organizerId: userId,
      recipientId: item.recipientId,
      recipientName: data.recipientName,
      message: data.message || null,
      storeId: item.store.id,
      productId: item.product.id,
      variationId: item.variation?.id ?? null,
      shippingOptionId: item.option.id,
      unitPrice: item.unitPrice,
      deliveryFee: item.option.fee,
      target,
      deadline: data.deadline,
    },
  });
  return getGroupGiftService(groupGift.code, userId);
};

// ---------------------------------------------------------------------------
// View

const VIEW_INCLUDE = {
  organizer: { select: { id: true, name: true, username: true, avatar: true } },
  recipient: { select: { id: true, name: true, username: true, avatar: true } },
  store: { select: { name: true, slug: true, isVerified: true } },
  product: {
    select: {
      id: true,
      title: true,
      images: { orderBy: [{ isPrimary: "desc" as const }, { id: "asc" as const }], take: 1, select: { url: true } },
    },
  },
  gift: { select: { code: true, status: true } },
  contributions: {
    where: { status: { in: [ContributionStatus.PAID, ContributionStatus.REFUNDED, ContributionStatus.REFUND_FAILED] } },
    orderBy: { paidAt: "asc" as const },
    select: {
      id: true,
      userId: true,
      amount: true,
      refundedAmount: true,
      message: true,
      hideName: true,
      status: true,
      paidAt: true,
      user: { select: { name: true, avatar: true } },
    },
  },
} satisfies Prisma.GroupGiftInclude;

type GroupGiftView = Prisma.GroupGiftGetPayload<{ include: typeof VIEW_INCLUDE }>;

const raisedOf = (groupGift: { contributions: { status: ContributionStatus; amount: number; refundedAmount: number }[] }) =>
  round(
    groupGift.contributions
      .filter((c) => c.status === ContributionStatus.PAID)
      .reduce((sum, c) => sum + c.amount - c.refundedAmount, 0)
  );

const findGroupGift = async (code: string) => {
  const groupGift = await prisma.groupGift.findUnique({ where: { code }, include: VIEW_INCLUDE });
  if (!groupGift) throw new AppError("This group gift doesn't exist.", 404);
  return groupGift;
};

const viewOf = (groupGift: GroupGiftView, viewerId?: string) => {
  const raised = raisedOf(groupGift);
  const mine = groupGift.contributions.filter((c) => c.userId === viewerId && c.status === ContributionStatus.PAID);
  return {
    code: groupGift.code,
    status: groupGift.status,
    recipientName: groupGift.recipientName,
    recipient: groupGift.recipient,
    organizer: groupGift.organizer,
    message: groupGift.message,
    product: { id: groupGift.product.id, title: groupGift.product.title, image: groupGift.product.images[0]?.url ?? null },
    store: groupGift.store,
    target: groupGift.target,
    raised,
    remaining: round(Math.max(0, groupGift.target - raised)),
    deadline: groupGift.deadline,
    closedAt: groupGift.closedAt,
    minContribution: MIN_CONTRIBUTION,
    // Names and messages - amounts stay private (no pressure to match).
    contributors: groupGift.contributions
      .filter((c) => c.status === ContributionStatus.PAID)
      .map((c) => ({ name: c.hideName ? null : c.user.name, avatar: c.hideName ? null : c.user.avatar, message: c.message, at: c.paidAt })),
    myContribution: mine.length ? round(mine.reduce((sum, c) => sum + c.amount - c.refundedAmount, 0)) : null,
    isOrganizer: viewerId === groupGift.organizerId,
    // Funded: the organiser can open the gift that was placed.
    giftCode: viewerId === groupGift.organizerId ? groupGift.gift?.code ?? null : null,
    createdAt: groupGift.createdAt,
  };
};

/** Public (login optional). The recipient sees only that something is coming - it's a surprise. */
export const getGroupGiftService = async (code: string, viewerId?: string) => {
  const groupGift = await findGroupGift(code);
  if (viewerId && viewerId === groupGift.recipientId && groupGift.status === GroupGiftStatus.OPEN) {
    return { code: groupGift.code, status: groupGift.status, surprise: true as const, recipientName: groupGift.recipientName };
  }
  return { ...viewOf(groupGift, viewerId), surprise: false as const };
};

// ---------------------------------------------------------------------------
// Contribute

/** Starts a contribution's Paystack payment. Confirmed by the webhook or POST /contributions/:reference/verify. */
export const contributeService = async (userId: string, code: string, data: ContributeInput) => {
  const groupGift = await findGroupGift(code);
  if (groupGift.status !== GroupGiftStatus.OPEN) throw new AppError("This group gift has closed.", 400);
  if (groupGift.deadline.getTime() <= Date.now()) throw new AppError("The deadline for this group gift has passed.", 400);
  if (userId === groupGift.recipientId) throw new AppError("This gift is for you - no chipping in on your own surprise!", 400);
  if (await isBlockedEitherWay(userId, groupGift.organizerId)) throw new AppError("You can't join this group gift.", 403);

  // What's left, counting payments other people have just started.
  const pending = await prisma.groupGiftContribution.aggregate({
    where: {
      groupGiftId: groupGift.id,
      status: ContributionStatus.PENDING,
      userId: { not: userId },
      createdAt: { gte: new Date(Date.now() - PENDING_HOLD_MS) },
    },
    _sum: { amount: true },
  });
  const remaining = round(groupGift.target - raisedOf(groupGift) - (pending._sum.amount ?? 0));
  if (remaining <= 0) throw new AppError("This gift is fully covered - friends are just finishing their payments.", 400);
  if (data.amount > remaining) throw new AppError(`Only ${naira(remaining)} is left - chip in up to that.`, 400);
  if (data.amount < Math.min(MIN_CONTRIBUTION, remaining)) {
    throw new AppError(`The smallest contribution is ${naira(Math.min(MIN_CONTRIBUTION, remaining))}.`, 400);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  const reference = `${REFERENCE_PREFIX}${crypto.randomUUID().replace(/-/g, "")}`;
  await prisma.groupGiftContribution.create({
    data: {
      groupGiftId: groupGift.id,
      userId,
      amount: round(data.amount),
      message: data.message || null,
      hideName: data.hideName ?? false,
      paymentReference: reference,
    },
  });

  // No split: Nestly holds it until the gift is placed (or refunds it).
  const paystack = await initializePaystackTransaction({
    email: user.email,
    amountKobo: Math.round(data.amount * NAIRA_TO_KOBO),
    reference,
    callbackUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/chip-in/${code}` : undefined,
  });
  return { reference, accessCode: paystack.access_code, authorizationUrl: paystack.authorization_url, amount: data.amount };
};

/**
 * A contribution's payment went through (webhook or the page's verify).
 * Idempotent. Reaching the target places the gift; a payment landing after
 * the group gift closed is refunded straight back.
 */
export const confirmContributionService = async (reference: string) => {
  const contribution = await prisma.groupGiftContribution.findUnique({
    where: { paymentReference: reference },
    include: { groupGift: { select: { id: true, code: true, status: true, organizerId: true, recipientName: true } }, user: { select: { name: true } } },
  });
  if (!contribution) throw new AppError("Contribution not found.", 404);
  if (contribution.status !== ContributionStatus.PENDING) return contribution;

  const paystack = await verifyPaystackTransaction(reference);
  if (paystack.status !== "success") throw new AppError("Payment was not successful.", 400);
  if (Math.round(contribution.amount * NAIRA_TO_KOBO) !== paystack.amount) throw new AppError("Payment amount mismatch.", 400);

  const claimed = await prisma.groupGiftContribution.updateMany({
    where: { id: contribution.id, status: ContributionStatus.PENDING },
    data: { status: ContributionStatus.PAID, paidAt: new Date() },
  });
  if (claimed.count === 0) return contribution;

  const { groupGift } = contribution;
  if (groupGift.status !== GroupGiftStatus.OPEN) {
    await refundContribution(contribution.id);
    return contribution;
  }

  if (contribution.userId !== groupGift.organizerId) {
    notify(
      groupGift.organizerId,
      "Someone chipped in 🎁",
      `${contribution.hideName ? "Someone" : contribution.user.name} chipped in ${naira(contribution.amount)} for ${groupGift.recipientName}'s gift.`,
      groupGift.code
    );
  }

  await completeIfFunded(groupGift.id);
  return contribution;
};

/** The contributor's page asks after the Paystack popup closes. */
export const verifyContributionService = async (userId: string, reference: string) => {
  const contribution = await prisma.groupGiftContribution.findUnique({
    where: { paymentReference: reference },
    select: { userId: true, groupGift: { select: { code: true } } },
  });
  if (!contribution || contribution.userId !== userId) throw new AppError("Contribution not found.", 404);
  await confirmContributionService(reference);
  return getGroupGiftService(contribution.groupGift.code, userId);
};

// ---------------------------------------------------------------------------
// Funded -> the gift is placed

/** The names on the gift: "From Ada, Kunle and 2 others". */
const fromLine = (contributors: { hideName: boolean; user: { name: string } }[], organizerName: string) => {
  const names = Array.from(new Set([organizerName, ...contributors.filter((c) => !c.hideName).map((c) => c.user.name)]));
  const hidden = contributors.filter((c) => c.hideName).length;
  const shown = names.slice(0, 4);
  const others = names.length - shown.length + hidden;
  const list = others > 0 ? `${shown.join(", ")} and ${others} other${others === 1 ? "" : "s"}` : shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}` : shown[0];
  return `From ${list}`;
};

const completeIfFunded = async (groupGiftId: string) => {
  const groupGift = await prisma.groupGift.findUniqueOrThrow({
    where: { id: groupGiftId },
    include: {
      organizer: { select: { name: true } },
      contributions: { where: { status: ContributionStatus.PAID }, orderBy: { paidAt: "asc" }, include: { user: { select: { name: true } } } },
    },
  });
  const raised = round(groupGift.contributions.reduce((sum, c) => sum + c.amount - c.refundedAmount, 0));
  if (raised < groupGift.target || groupGift.status !== GroupGiftStatus.OPEN) return;

  // Only one caller places the gift (two last payments landing together).
  const won = await prisma.groupGift.updateMany({
    where: { id: groupGift.id, status: GroupGiftStatus.OPEN },
    data: { status: GroupGiftStatus.FUNDED, closedAt: new Date() },
  });
  if (won.count === 0) return;

  try {
    const item = await resolveGiftItem(groupGift.organizerId, {
      productId: groupGift.productId,
      variationId: groupGift.variationId ?? undefined,
      quantity: 1,
      shippingOptionId: groupGift.shippingOptionId,
      recipientId: groupGift.recipientId,
    });
    const message = [groupGift.message, fromLine(groupGift.contributions, groupGift.organizer.name)].filter(Boolean).join("\n\n");
    const { order } = await createGiftOrder(groupGift.organizerId, item, {
      recipientName: groupGift.recipientName,
      message,
      paymentReference: null,
      // The price everyone chipped in for.
      unitPrice: groupGift.unitPrice,
      deliveryFee: groupGift.deliveryFee,
    });
    await prisma.groupGift.update({ where: { id: groupGift.id }, data: { giftId: order.gift!.id } });

    // Paid in full by the contributions: stock taken, gift SENT, the
    // organiser gets the link and the recipient is told (checkout/).
    const placed = await finalizeOrderPayment(order);
    if (placed.status === OrderStatus.CANCELLED) throw new Error("Sold out as the gift was placed");
  } catch (error) {
    console.error(`Group gift ${groupGift.code} couldn't be placed:`, error);
    await prisma.groupGift.update({ where: { id: groupGift.id }, data: { status: GroupGiftStatus.FAILED } });
    await refundGroupGiftContributions(groupGift.id);
    const everyone = new Set([groupGift.organizerId, ...groupGift.contributions.map((c) => c.userId)]);
    for (const userId of everyone) {
      notify(userId, "Group gift refunded", `The gift for ${groupGift.recipientName} couldn't be placed (the item sold out or the shop closed). Everyone is being refunded.`, groupGift.code);
    }
    return;
  }

  // Two last payments at once can go over: give the extra back to the latest.
  let excess = round(raised - groupGift.target);
  for (const contribution of [...groupGift.contributions].reverse()) {
    if (excess <= 0) break;
    const back = Math.min(excess, contribution.amount - contribution.refundedAmount);
    if (back <= 0) continue;
    await refundContribution(contribution.id, back).catch(() => undefined);
    excess = round(excess - back);
  }

  const everyone = new Set(groupGift.contributions.map((c) => c.userId).filter((id) => id !== groupGift.organizerId));
  for (const userId of everyone) {
    notify(userId, "You did it! 🎉", `The group gift for ${groupGift.recipientName} is fully paid - it's on its way to them.`, groupGift.code);
  }
};

// ---------------------------------------------------------------------------
// Closing and refunds

/** Refunds one contribution (or `amount` of it) through Paystack. */
const refundContribution = async (contributionId: string, amount?: number) => {
  const contribution = await prisma.groupGiftContribution.findUniqueOrThrow({ where: { id: contributionId } });
  if (contribution.status !== ContributionStatus.PAID) return;
  const left = round(contribution.amount - contribution.refundedAmount);
  const value = amount === undefined ? left : Math.min(amount, left);
  if (value <= 0) return;
  const whole = value === contribution.amount && contribution.refundedAmount === 0;
  try {
    await refundPaystackTransaction(contribution.paymentReference, whole ? undefined : Math.round(value * NAIRA_TO_KOBO));
    const refundedAmount = round(contribution.refundedAmount + value);
    await prisma.groupGiftContribution.update({
      where: { id: contribution.id },
      data: { refundedAmount, ...(refundedAmount >= contribution.amount ? { status: ContributionStatus.REFUNDED } : {}) },
    });
  } catch (error) {
    console.error(`Refund for contribution ${contribution.id} failed:`, error);
    if (amount === undefined) {
      await prisma.groupGiftContribution.update({ where: { id: contribution.id }, data: { status: ContributionStatus.REFUND_FAILED } });
    }
    throw error;
  }
};

/**
 * Refunds everyone who chipped in (expired, cancelled, couldn't be placed,
 * or the placed gift was declined / not claimed). Admins are told about any
 * Paystack refused.
 */
export const refundGroupGiftContributions = async (groupGiftId: string) => {
  const paid = await prisma.groupGiftContribution.findMany({
    where: { groupGiftId, status: ContributionStatus.PAID },
    select: { id: true },
  });
  let refunded = 0;
  let failed = 0;
  for (const { id } of paid) {
    try {
      await refundContribution(id);
      refunded += 1;
    } catch {
      failed += 1;
    }
  }
  if (failed > 0) {
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN, deletedAt: null }, select: { id: true } });
    await Promise.allSettled(
      admins.map((admin) =>
        createNotificationService(
          admin.id,
          "Refunds need you",
          `${failed} group-gift contribution refund${failed === 1 ? "" : "s"} failed. Refund them by hand in Paystack (references start with ${REFERENCE_PREFIX}).`,
          NotificationType.SYSTEM,
          { type: "ADMIN_REFUND_NEEDED", id: groupGiftId }
        )
      )
    );
  }
  return { refunded, failed };
};

/** Closes an open group gift and refunds everyone (cancelled or expired). */
const closeOpen = async (groupGiftId: string, status: (typeof GroupGiftStatus)["CANCELLED" | "EXPIRED"]) => {
  const won = await prisma.groupGift.updateMany({
    where: { id: groupGiftId, status: GroupGiftStatus.OPEN },
    data: { status, closedAt: new Date() },
  });
  if (won.count === 0) return false;
  const groupGift = await prisma.groupGift.findUniqueOrThrow({
    where: { id: groupGiftId },
    include: { contributions: { where: { status: ContributionStatus.PAID }, select: { userId: true } } },
  });
  await refundGroupGiftContributions(groupGiftId);
  const everyone = new Set([groupGift.organizerId, ...groupGift.contributions.map((c) => c.userId)]);
  for (const userId of everyone) {
    notify(
      userId,
      status === GroupGiftStatus.CANCELLED ? "Group gift called off" : "Group gift didn't make it",
      status === GroupGiftStatus.CANCELLED
        ? `The group gift for ${groupGift.recipientName} was called off. Anything you chipped in is being refunded.`
        : `The group gift for ${groupGift.recipientName} didn't reach its total in time. Anything you chipped in is being refunded.`,
      groupGift.code
    );
  }
  return true;
};

/** The organiser calls it off (while open) - everyone refunded. */
export const cancelGroupGiftService = async (userId: string, code: string) => {
  const groupGift = await findGroupGift(code);
  if (groupGift.organizerId !== userId) throw new AppError("Only the person who started it can call it off.", 403);
  if (!(await closeOpen(groupGift.id, GroupGiftStatus.CANCELLED))) throw new AppError("This group gift has already closed.", 400);
  return getGroupGiftService(code, userId);
};

/** Job: closes group gifts whose deadline passed before they were funded. */
export const expireGroupGiftsService = async (now: Date = new Date()) => {
  const due = await prisma.groupGift.findMany({
    where: { status: GroupGiftStatus.OPEN, deadline: { lte: now } },
    select: { id: true },
    take: 50,
  });
  let count = 0;
  for (const { id } of due) {
    if (await closeOpen(id, GroupGiftStatus.EXPIRED).catch(() => false)) count++;
  }
  return count;
};
