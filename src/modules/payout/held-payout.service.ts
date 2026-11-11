import crypto from "crypto";
import {
  NotificationType,
  OrderItemStatus,
  PayoutMethod,
  PayoutStatus,
  Prisma,
  ReturnRequestStatus,
  Role,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { isStaging } from "../../config/environment";
import { AppError } from "../../utils/appError";
import { SELLER_VISIBLE_ORDER } from "../../utils/giftOrders";
import { getStoreAvailableBalance, REVENUE_STATUSES } from "../../utils/sellerRevenue";
import { holdPayoutsEnabled, transfersEnabled } from "../../utils/payoutMode";
import { OPEN_RETURN_STATUSES } from "../../utils/returnStatuses";
import { createTransferRecipient, initiateTransfer, TransferResult, verifyTransfer } from "../../utils/paystack";
import { createNotificationService } from "../notification/notification.service";
import { deliver, safely, sellerEarningsUrl, USER_SELECT } from "../order/order-notifications";
import { orderNumber, returnWindowEndsAt } from "../order/order-delivery";
import { getSellerStore } from "../seller/seller.utils";
import { PAYOUT_ACCOUNT_HOLD_HOURS } from "../store/store.service";
import { naira, payoutSentEmail } from "../../templates/payout-emails.template";

// Hold-then-pay (see utils/payoutMode). The unit of payout is one seller's
// part of one order - its OrderShipping row with heldForPayout set. It
// becomes payable once every item is delivered and confirmed, the return
// window has closed for all of them, and no problem report is open. The
// amount is the items' price less Nestly's commission, plus the delivery
// fee - less anything refunded. A daily run pays each seller everything
// that's ready in one Paystack transfer.

export { OPEN_RETURN_STATUSES };

/** Paystack won't send tiny amounts; smaller balances wait for the next order. */
export const MIN_PAYOUT = 100;

export type UnitState =
  | "AWAITING_DELIVERY" // not every item is delivered and confirmed yet
  | "IN_RETURN_WINDOW" // the buyer can still report a problem (until releaseAt)
  | "ON_HOLD" // a problem report is open
  | "READY" // will be paid in the next payout run
  | "NOTHING_DUE"; // everything was refunded or cancelled

const kobo = (naira: number) => Math.round(naira * 100);
const round = (naira: number) => kobo(naira) / 100;

const UNIT_INCLUDE = {
  order: {
    select: {
      id: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          status: true,
          quantity: true,
          totalPrice: true,
          commissionRate: true,
          deliveryConfirmedAt: true,
          productTitle: true,
          product: { select: { title: true, storeId: true, category: { select: { isPerishable: true } } } },
          returnRequests: { select: { status: true } },
        },
      },
    },
  },
} satisfies Prisma.OrderShippingInclude;

type Unit = Prisma.OrderShippingGetPayload<{ include: typeof UNIT_INCLUDE }>;

/** Where one seller's part of an order stands for payout, and what it's worth. */
export const evaluateUnit = (unit: Unit, now = new Date()) => {
  const items = unit.order.items.filter((item) => item.product.storeId === unit.storeId && item.status !== OrderItemStatus.CANCELLED);
  const refunded = (item: (typeof items)[number]) => item.returnRequests.some((r) => r.status === ReturnRequestStatus.REFUNDED);
  const kept = items.filter((item) => !refunded(item));

  // Nothing kept means nothing delivered was paid for - the fee was refunded too.
  const amount = round(
    kept.reduce((sum, item) => sum + item.totalPrice * (1 - item.commissionRate / 100), 0) + (kept.length > 0 ? unit.fee : 0)
  );
  const base = { amount, items: kept, releaseAt: null as Date | null };

  if (items.some((item) => item.returnRequests.some((r) => OPEN_RETURN_STATUSES.includes(r.status)))) {
    return { ...base, state: "ON_HOLD" as UnitState };
  }
  if (kept.length === 0) return { ...base, amount: 0, state: "NOTHING_DUE" as UnitState };
  if (kept.some((item) => !item.deliveryConfirmedAt)) return { ...base, state: "AWAITING_DELIVERY" as UnitState };

  const releaseAt = new Date(
    Math.max(...kept.map((item) => returnWindowEndsAt(item.deliveryConfirmedAt!, item.product.category.isPerishable).getTime()))
  );
  return { ...base, releaseAt, state: (releaseAt > now ? "IN_RETURN_WINDOW" : "READY") as UnitState };
};

/** Held, unsettled payout units (paid orders the seller can see). */
const loadUnits = (where: Prisma.OrderShippingWhereInput = {}) =>
  prisma.orderShipping.findMany({
    where: {
      heldForPayout: true,
      settledAt: null,
      order: { status: { in: REVENUE_STATUSES }, ...SELLER_VISIBLE_ORDER },
      ...where,
    },
    include: UNIT_INCLUDE,
    orderBy: { createdAt: "asc" },
  });

const bankLabelOf = (store: { payoutBankName: string | null; payoutAccountNumber: string | null }) =>
  store.payoutAccountNumber ? `${store.payoutBankName ?? "your bank"} ••••${store.payoutAccountNumber.slice(-4)}` : null;

// Bank details changed in the last PAYOUT_ACCOUNT_HOLD_HOURS: wait, so a
// hijacked account can be caught before money moves.
const accountOnHoldUntil = (store: { payoutAccountUpdatedAt: Date | null }) => {
  if (!store.payoutAccountUpdatedAt) return null;
  const until = new Date(store.payoutAccountUpdatedAt.getTime() + PAYOUT_ACCOUNT_HOLD_HOURS * 60 * 60 * 1000);
  return until > new Date() ? until : null;
};

const notifyAdmins = async (title: string, message: string, target: { type: string; id: string }) => {
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN, deletedAt: null }, select: { id: true } });
  await Promise.allSettled(admins.map((admin) => createNotificationService(admin.id, title, message, NotificationType.SYSTEM, target)));
};

// ---- Transfer outcomes ----------------------------------------------------

const notifyPayoutSent = (payoutId: string) =>
  safely("Payout sent notification", async () => {
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      select: {
        amount: true,
        bankLabel: true,
        _count: { select: { shipping: true } },
        store: { select: { seller: { select: { user: { select: USER_SELECT } } } } },
      },
    });
    if (!payout) return;
    const seller = payout.store.seller.user;
    const bankLabel = payout.bankLabel ?? "your bank";

    await deliver({
      to: seller,
      title: "Payout sent",
      message: `${naira(payout.amount)} is on its way to ${bankLabel}.`,
      target: { type: "SELLER_EARNINGS", id: payoutId },
      email: {
        subject: `${naira(payout.amount)} sent to your bank`,
        html: payoutSentEmail({
          name: seller.name,
          amount: payout.amount,
          bankLabel,
          orderCount: payout._count.shipping,
          earningsUrl: sellerEarningsUrl(),
        }),
      },
    });
  });

const markPaid = async (payoutId: string) => {
  const now = new Date();
  const done = await prisma.$transaction(async (tx) => {
    const updated = await tx.payout.updateMany({
      where: { id: payoutId, status: PayoutStatus.PENDING },
      data: { status: PayoutStatus.PAID, failureReason: null },
    });
    if (updated.count === 0) return false;
    await tx.orderShipping.updateMany({ where: { payoutId }, data: { settledAt: now } });
    return true;
  });
  if (done) notifyPayoutSent(payoutId);
};

// Failed, or reversed after it was sent: the orders go back into the queue
// and are paid in the next run. Admins are told, since it usually means a
// bad account, an empty balance or transfer OTP still switched on.
const markFailed = async (payoutId: string, reason: string) => {
  const payout = await prisma.$transaction(async (tx) => {
    const updated = await tx.payout.updateMany({
      where: { id: payoutId, status: { in: [PayoutStatus.PENDING, PayoutStatus.PAID] } },
      data: { status: PayoutStatus.FAILED, failureReason: reason.slice(0, 300) },
    });
    if (updated.count === 0) return null;
    await tx.orderShipping.updateMany({ where: { payoutId }, data: { payoutId: null, settledAt: null } });
    return tx.payout.findUnique({ where: { id: payoutId }, select: { amount: true, store: { select: { name: true } } } });
  });
  if (!payout) return;

  safely("Payout failed notification", () =>
    notifyAdmins(
      "Seller payout failed",
      `${naira(payout.amount)} to ${payout.store.name} didn't go through: ${reason}. It will be retried in the next run.`,
      { type: "ADMIN_PAYOUT_FAILED", id: payoutId }
    )
  );
};

const FAILED_TRANSFER: TransferResult["status"][] = ["failed", "reversed", "abandoned", "blocked", "rejected", "otp"];

const applyTransferStatus = async (payoutId: string, status: TransferResult["status"], reason?: string) => {
  if (status === "success") return markPaid(payoutId);
  if (status === "otp") return markFailed(payoutId, "Transfer OTP is switched on in Paystack - turn it off so payouts can go automatically");
  if (FAILED_TRANSFER.includes(status)) return markFailed(payoutId, reason || `Paystack marked the transfer ${status}`);
  // pending / received: Paystack is still processing - a webhook or the next check settles it.
};

/** Paystack webhook: transfer.success / transfer.failed / transfer.reversed. */
export const handleTransferWebhookService = async (event: string, data: { reference?: string; reason?: string }) => {
  if (!data?.reference) return;
  const payout = await prisma.payout.findUnique({ where: { transferReference: data.reference }, select: { id: true } });
  if (!payout) return;

  if (event === "transfer.success") await markPaid(payout.id);
  else if (event === "transfer.failed") await markFailed(payout.id, data.reason || "Transfer failed");
  else if (event === "transfer.reversed") await markFailed(payout.id, data.reason || "Transfer was reversed");
};

// Transfers still pending a while after they were sent (a missed webhook).
const checkPendingTransfers = async () => {
  const stale = await prisma.payout.findMany({
    where: {
      method: PayoutMethod.TRANSFER,
      status: PayoutStatus.PENDING,
      transferReference: { not: null },
      createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) },
    },
    select: { id: true, transferReference: true },
    take: 50,
  });

  for (const payout of stale) {
    try {
      const result = await verifyTransfer(payout.transferReference!);
      await applyTransferStatus(payout.id, result.status, result.reason);
    } catch (error) {
      console.error(`Couldn't check transfer ${payout.transferReference}:`, error);
    }
  }
};

// ---- Paying sellers ----------------------------------------------------

const ensureRecipient = async (store: {
  id: string;
  payoutAccountName: string | null;
  payoutAccountNumber: string | null;
  payoutBankCode: string | null;
  paystackRecipientCode: string | null;
  paystackRecipientFor: string | null;
  name: string;
}) => {
  const forAccount = `${store.payoutBankCode}:${store.payoutAccountNumber}`;
  if (store.paystackRecipientCode && store.paystackRecipientFor === forAccount) return store.paystackRecipientCode;

  const code = await createTransferRecipient({
    name: store.payoutAccountName ?? store.name,
    accountNumber: store.payoutAccountNumber!,
    bankCode: store.payoutBankCode!,
  });
  await prisma.store.update({ where: { id: store.id }, data: { paystackRecipientCode: code, paystackRecipientFor: forAccount } });
  return code;
};

type SkipReason = "NO_BANK_ACCOUNT" | "ACCOUNT_RECENTLY_CHANGED" | "ALREADY_PAID_TODAY" | "BELOW_MINIMUM";

const payStore = async (storeId: string, units: Unit[], amount: number, force: boolean): Promise<{ sent: boolean; skipped?: SkipReason }> => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      payoutBankName: true,
      payoutBankCode: true,
      payoutAccountNumber: true,
      payoutAccountName: true,
      payoutAccountUpdatedAt: true,
      paystackRecipientCode: true,
      paystackRecipientFor: true,
    },
  });
  if (!store?.payoutBankCode || !store.payoutAccountNumber) return { sent: false, skipped: "NO_BANK_ACCOUNT" };
  if (accountOnHoldUntil(store)) return { sent: false, skipped: "ACCOUNT_RECENTLY_CHANGED" };
  if (amount < MIN_PAYOUT) return { sent: false, skipped: "BELOW_MINIMUM" };

  // One transfer a day per seller in production (fewer transfer fees);
  // staging pays every run so testers don't wait.
  if (!isStaging && !force) {
    const recent = await prisma.payout.count({
      where: {
        storeId,
        method: PayoutMethod.TRANSFER,
        status: { in: [PayoutStatus.PENDING, PayoutStatus.PAID] },
        createdAt: { gt: new Date(Date.now() - 20 * 60 * 60 * 1000) },
      },
    });
    if (recent > 0) return { sent: false, skipped: "ALREADY_PAID_TODAY" };
  }

  const recipient = await ensureRecipient(store);
  const reference = `nestly_payout_${crypto.randomUUID().replace(/-/g, "")}`;
  const unitIds = units.map((unit) => unit.id);

  // Claim the orders for this payout first, so a second run (or a second
  // server) can't pay them again.
  const payout = await prisma.$transaction(async (tx) => {
    const created = await tx.payout.create({
      data: {
        storeId,
        amount,
        method: PayoutMethod.TRANSFER,
        status: PayoutStatus.PENDING,
        transferReference: reference,
        createdBy: "SYSTEM",
        bankLabel: bankLabelOf(store),
        note: `Automatic payout for ${unitIds.length} order${unitIds.length === 1 ? "" : "s"}`,
      },
    });
    const claimed = await tx.orderShipping.updateMany({
      where: { id: { in: unitIds }, payoutId: null, settledAt: null },
      data: { payoutId: created.id },
    });
    if (claimed.count !== unitIds.length) throw new AppError("Orders changed while paying - will retry.", 409);
    return created;
  });

  try {
    const result = await initiateTransfer({
      amountKobo: kobo(amount),
      recipient,
      reference,
      reason: `Nestly payout - ${store.name}`.slice(0, 100),
    });
    await prisma.payout.update({ where: { id: payout.id }, data: { transferCode: result.transfer_code } });
    await applyTransferStatus(payout.id, result.status, result.reason);
  } catch (error) {
    await markFailed(payout.id, error instanceof Error ? error.message : "Couldn't reach Paystack");
  }
  return { sent: true };
};

/**
 * One payout run: closes orders with nothing left to pay, checks transfers
 * still pending, then (when transfers are on) pays each seller everything
 * that's ready in one transfer. Safe to run on several servers at once -
 * orders are claimed before any money moves.
 */
export const runHeldPayoutsService = async ({ force = false }: { force?: boolean } = {}) => {
  const summary = { settled: 0, transfers: 0, ready: 0, skipped: {} as Record<string, SkipReason> };

  if (transfersEnabled()) await checkPendingTransfers();

  const ready = new Map<string, { units: Unit[]; amount: number }>();
  for (const unit of await loadUnits({ payoutId: null })) {
    const { state, amount } = evaluateUnit(unit);
    if (state === "NOTHING_DUE") {
      const closed = await prisma.orderShipping.updateMany({
        where: { id: unit.id, payoutId: null, settledAt: null },
        data: { settledAt: new Date() },
      });
      summary.settled += closed.count;
    } else if (state === "READY") {
      const entry = ready.get(unit.storeId) ?? { units: [], amount: 0 };
      entry.units.push(unit);
      entry.amount = round(entry.amount + amount);
      ready.set(unit.storeId, entry);
    }
  }
  summary.ready = ready.size;

  if (!transfersEnabled()) return summary;

  for (const [storeId, { units, amount }] of ready) {
    try {
      const result = await payStore(storeId, units, amount, force);
      if (result.sent) summary.transfers += 1;
      else if (result.skipped) summary.skipped[storeId] = result.skipped;
    } catch (error) {
      console.error(`Payout to store ${storeId} failed:`, error);
    }
  }
  return summary;
};

/**
 * Admin: pay a seller's ready orders by hand (transfers off, or a payout
 * Paystack keeps refusing). Records the payout and closes the orders.
 */
export const payHeldManuallyService = async (adminUserId: string, storeId: string, note?: string) => {
  const ready = (await loadUnits({ storeId, payoutId: null })).filter((unit) => evaluateUnit(unit).state === "READY");
  if (ready.length === 0) throw new AppError("Nothing is ready to pay for this store.", 400);

  const amount = round(ready.reduce((sum, unit) => sum + evaluateUnit(unit).amount, 0));
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { payoutBankName: true, payoutAccountNumber: true } });

  const payout = await prisma.$transaction(async (tx) => {
    const created = await tx.payout.create({
      data: {
        storeId,
        amount,
        method: PayoutMethod.MANUAL,
        status: PayoutStatus.PAID,
        createdBy: adminUserId,
        bankLabel: store ? bankLabelOf(store) : null,
        note: note?.trim() || `Paid by hand for ${ready.length} order${ready.length === 1 ? "" : "s"}`,
      },
    });
    const claimed = await tx.orderShipping.updateMany({
      where: { id: { in: ready.map((unit) => unit.id) }, payoutId: null, settledAt: null },
      data: { payoutId: created.id, settledAt: new Date() },
    });
    if (claimed.count !== ready.length) throw new AppError("These orders changed while paying - try again.", 409);
    return created;
  });

  notifyPayoutSent(payout.id);
  return payout;
};

// ---- What sellers and admins see -----------------------------------------

const unitView = (unit: Unit, now: Date) => {
  const { state, amount, releaseAt, items } = evaluateUnit(unit, now);
  return {
    orderId: unit.orderId,
    orderNumber: orderNumber(unit.orderId),
    orderedAt: unit.order.createdAt,
    state: unit.payoutId ? ("PROCESSING" as const) : state,
    amount,
    releaseAt,
    items: items.map((item) => ({ title: item.productTitle ?? item.product.title, quantity: item.quantity })),
  };
};

const TOTAL_KEYS = ["AWAITING_DELIVERY", "IN_RETURN_WINDOW", "ON_HOLD", "READY", "PROCESSING"] as const;

/** A seller's earnings under hold-then-pay: what's coming, when, and what's been paid. */
export const getMyPayoutsService = async (userId: string) => {
  const store = await getSellerStore(userId);
  const now = new Date();

  const [units, payouts, paid, legacy, bank] = await Promise.all([
    loadUnits({ storeId: store.id }),
    // A failed transfer's orders go back in the queue and are paid in a new
    // one, so sellers never see the failed attempt.
    prisma.payout.findMany({
      where: { storeId: store.id, status: { not: PayoutStatus.FAILED } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, amount: true, method: true, status: true, bankLabel: true, note: true, createdAt: true, _count: { select: { shipping: true } } },
    }),
    prisma.payout.aggregate({ where: { storeId: store.id, status: PayoutStatus.PAID }, _sum: { amount: true } }),
    getStoreAvailableBalance(store.id),
    prisma.store.findUnique({
      where: { id: store.id },
      select: { payoutBankName: true, payoutAccountNumber: true, payoutAccountUpdatedAt: true },
    }),
  ]);

  const orders = units
    .map((unit) => unitView(unit, now))
    .filter((unit) => unit.state !== "NOTHING_DUE")
    .sort((a, b) => (a.releaseAt?.getTime() ?? Infinity) - (b.releaseAt?.getTime() ?? Infinity));

  const totals = Object.fromEntries(TOTAL_KEYS.map((key) => [key, 0])) as Record<(typeof TOTAL_KEYS)[number], number>;
  for (const order of orders) totals[order.state as (typeof TOTAL_KEYS)[number]] = round(totals[order.state as (typeof TOTAL_KEYS)[number]] + order.amount);

  return {
    holdPayouts: holdPayoutsEnabled(),
    automaticTransfers: transfersEnabled(),
    bankAccount: bank ? bankLabelOf(bank) : null,
    bankOnHoldUntil: bank ? accountOnHoldUntil(bank) : null,
    totals,
    totalPaidOut: round(paid._sum.amount ?? 0),
    orders: orders.slice(0, 50),
    payouts: payouts.map(({ _count, ...payout }) => ({ ...payout, orderCount: _count.shipping })),
    // Orders from before hold-then-pay (paid by hand), if any balance is left.
    earlierBalance: round(legacy.availableBalance),
  };
};

/** Admin: every seller with held money, by state, plus transfers that failed. */
export const getHeldPayoutsOverviewService = async () => {
  const now = new Date();
  const units = await loadUnits();

  const byStore = new Map<string, Record<string, number>>();
  for (const unit of units) {
    const { state, amount } = unitView(unit, now);
    if (state === "NOTHING_DUE") continue;
    const totals = byStore.get(unit.storeId) ?? Object.fromEntries(TOTAL_KEYS.map((key) => [key, 0]));
    totals[state] = round(totals[state] + amount);
    byStore.set(unit.storeId, totals);
  }

  const [stores, failed] = await Promise.all([
    prisma.store.findMany({
      where: { id: { in: [...byStore.keys()] } },
      select: { id: true, name: true, slug: true, payoutBankName: true, payoutAccountNumber: true, payoutAccountUpdatedAt: true },
    }),
    prisma.payout.findMany({
      where: { status: PayoutStatus.FAILED, createdAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, amount: true, failureReason: true, createdAt: true, store: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    holdPayouts: holdPayoutsEnabled(),
    automaticTransfers: transfersEnabled(),
    stores: stores
      .map((store) => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        bankAccount: bankLabelOf(store),
        bankOnHoldUntil: accountOnHoldUntil(store),
        totals: byStore.get(store.id)!,
      }))
      .sort((a, b) => b.totals.READY - a.totals.READY || b.totals.IN_RETURN_WINDOW - a.totals.IN_RETURN_WINDOW),
    failedTransfers: failed,
  };
};
