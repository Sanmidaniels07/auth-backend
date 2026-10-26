import { NotificationType, SellerStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { sendEmail } from "../auth/email.services";
import { createNotificationService } from "../notification/notification.service";
import { cacReminderTemplate } from "../../templates/cac-reminder.template";

// Sellers who joined without a CAC number get two gentle reminders - a few
// days after approval and again after two weeks - in the app and by email.
// Never more than two, and at least a week apart (so sellers approved long
// before this existed don't get both at once).
const REMINDER_DAYS = [3, 14];
const MIN_GAP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const settingsUrl = () => `${process.env.FRONTEND_URL ?? ""}/settings/marketplace?tab=store#business-verification`;

export const sendCacRemindersService = async (now: Date = new Date()) => {
  const sellers = await prisma.sellerProfile.findMany({
    where: {
      status: SellerStatus.APPROVED,
      OR: [{ cacNumber: null }, { cacNumber: "" }],
      cacRemindersSent: { lt: REMINDER_DAYS.length },
    },
    select: {
      id: true,
      cacRemindersSent: true,
      lastCacReminderAt: true,
      statusUpdatedAt: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      store: { select: { name: true } },
    },
  });

  let sent = 0;

  for (const seller of sellers) {
    const approvedAt = seller.statusUpdatedAt ?? seller.createdAt;
    const dueAfter = REMINDER_DAYS[seller.cacRemindersSent] * DAY_MS;
    if (now.getTime() - approvedAt.getTime() < dueAfter) continue;
    if (seller.lastCacReminderAt && now.getTime() - seller.lastCacReminderAt.getTime() < MIN_GAP_DAYS * DAY_MS) continue;

    // Claim this reminder first so overlapping runs can't send it twice.
    const claim = await prisma.sellerProfile.updateMany({
      where: { id: seller.id, cacRemindersSent: seller.cacRemindersSent },
      data: { cacRemindersSent: { increment: 1 }, lastCacReminderAt: now },
    });
    if (claim.count === 0) continue;

    await Promise.allSettled([
      createNotificationService(
        seller.user.id,
        "Get your store verified",
        "Add your CAC number in Seller Hub to get a verified badge buyers can trust.",
        NotificationType.SYSTEM,
        { type: "CAC_REMINDER", id: seller.id }
      ),
      sendEmail(seller.user.email, "Get a verified badge on your Nestly store", cacReminderTemplate(seller.user.name, seller.store?.name ?? null, settingsUrl())),
    ]).then((results) =>
      results.forEach((result) => {
        if (result.status === "rejected") console.error(`CAC reminder to ${seller.user.id} failed:`, result.reason);
      })
    );
    sent += 1;
  }

  return sent;
};
