import { NotificationType, SellerStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { sendEmail } from "../auth/email.services";
import { createNotificationService } from "../notification/notification.service";
import { cacReminderTemplate } from "../../templates/cac-reminder.template";

// Every approved seller without a CAC number (store or not) is reminded in
// the app and by email: first a few days after approval, then every two
// weeks until they add one - occasional, never daily. (The Seller Hub and
// home dashboard also show a banner the whole time.)
const FIRST_AFTER_DAYS = 3;
const EVERY_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// Seller Hub opens with the CAC form ready (works without a store too).
const sellerHubUrl = () => `${process.env.FRONTEND_URL ?? ""}/settings/marketplace?cac=1`;

export const sendCacRemindersService = async (now: Date = new Date()) => {
  const sellers = await prisma.sellerProfile.findMany({
    where: {
      status: SellerStatus.APPROVED,
      OR: [{ cacNumber: null }, { cacNumber: "" }],
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
    const dueAt = seller.lastCacReminderAt
      ? seller.lastCacReminderAt.getTime() + EVERY_DAYS * DAY_MS
      : approvedAt.getTime() + FIRST_AFTER_DAYS * DAY_MS;
    if (now.getTime() < dueAt) continue;

    // Claim this reminder first so overlapping runs can't send it twice.
    const claim = await prisma.sellerProfile.updateMany({
      where: { id: seller.id, cacRemindersSent: seller.cacRemindersSent },
      data: { cacRemindersSent: { increment: 1 }, lastCacReminderAt: now },
    });
    if (claim.count === 0) continue;

    await Promise.allSettled([
      createNotificationService(
        seller.user.id,
        "Add your CAC number",
        "Registered with the CAC? Add your number in Seller Hub to get a verified badge buyers can trust.",
        NotificationType.SYSTEM,
        { type: "CAC_REMINDER", id: seller.id }
      ),
      sendEmail(seller.user.email, "Get a verified badge on your Nestly store", cacReminderTemplate(seller.user.name, seller.store?.name ?? null, sellerHubUrl())),
    ]).then((results) =>
      results.forEach((result) => {
        if (result.status === "rejected") console.error(`CAC reminder to ${seller.user.id} failed:`, result.reason);
      })
    );
    sent += 1;
  }

  return sent;
};
