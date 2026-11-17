import { NotificationType, Role } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { createNotificationService } from "../notification/notification.service";
import { heldAmountForStore } from "../payout/held-payout.service";

// Quick-start stores sell before they're reviewed, and their money waits
// for the review - so a review mustn't be forgotten. Admins are reminded
// once a store has waited a day, and again when it's overdue (two days).

const HOUR_MS = 60 * 60 * 1000;
export const REVIEW_REMINDER_HOURS = 24;
export const REVIEW_OVERDUE_HOURS = 48;

const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

const notifyAdmins = async (title: string, message: string, sellerProfileId: string) => {
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN, deletedAt: null }, select: { id: true } });
  await Promise.allSettled(
    admins.map((admin) =>
      createNotificationService(admin.id, title, message, NotificationType.SYSTEM, { type: "ADMIN_SELLER_APPLICATION", id: sellerProfileId })
    )
  );
};

/** Sends the due reminders; returns how many. Each is claimed first, so runs never double up. */
export const sendReviewRemindersService = async (now: Date = new Date()) => {
  const stores = await prisma.store.findMany({
    where: {
      underReview: true,
      isSuspended: false,
      reviewRemindersSent: { lt: 2 },
      createdAt: { lte: new Date(now.getTime() - REVIEW_REMINDER_HOURS * HOUR_MS) },
    },
    select: { id: true, name: true, createdAt: true, reviewRemindersSent: true, sellerId: true },
  });

  let sent = 0;
  for (const store of stores) {
    const overdue = store.createdAt.getTime() <= now.getTime() - REVIEW_OVERDUE_HOURS * HOUR_MS;
    const stage = overdue ? 2 : 1;
    if (store.reviewRemindersSent >= stage) continue;

    const claimed = await prisma.store.updateMany({
      where: { id: store.id, reviewRemindersSent: store.reviewRemindersSent },
      data: { reviewRemindersSent: stage },
    });
    if (claimed.count === 0) continue;

    const held = await heldAmountForStore(store.id);
    const money = held > 0 ? ` ${naira(held)} of their sales is waiting on it.` : "";
    await notifyAdmins(
      overdue ? "Seller review overdue" : "Seller waiting for review",
      overdue
        ? `"${store.name}" has been selling for 2 days without a review.${money} Review them in Sellers → Needs review.`
        : `"${store.name}" started selling a day ago and still needs a review.${money}`,
      store.sellerId
    );
    sent += 1;
  }
  return sent;
};
