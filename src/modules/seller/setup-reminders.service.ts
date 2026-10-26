import { NotificationType, SellerStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { sendEmail } from "../auth/email.services";
import { createNotificationService } from "../notification/notification.service";
import { setupReminderTemplate } from "../../templates/setup-reminder.template";
import { READINESS_SELECT, READINESS_STEPS, missingSetup } from "../../utils/sellerReadiness";

// Approved sellers whose store isn't ready to take orders (no store, payout
// account, delivery zones or published product) are reminded in the app and
// by email: first 2 days after approval, then once a week until it's done.
// The Seller Hub and home dashboard show a banner the whole time.
const FIRST_AFTER_DAYS = 2;
const EVERY_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const frontend = () => process.env.FRONTEND_URL ?? "";

export const sendSetupRemindersService = async (now: Date = new Date()) => {
  const sellers = await prisma.sellerProfile.findMany({
    where: { status: SellerStatus.APPROVED },
    select: {
      id: true,
      setupRemindersSent: true,
      lastSetupReminderAt: true,
      statusUpdatedAt: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      ...READINESS_SELECT,
    },
  });

  let sent = 0;

  for (const seller of sellers) {
    const missing = missingSetup(seller);
    if (missing.length === 0) continue;

    const approvedAt = seller.statusUpdatedAt ?? seller.createdAt;
    const dueAt = seller.lastSetupReminderAt
      ? seller.lastSetupReminderAt.getTime() + EVERY_DAYS * DAY_MS
      : approvedAt.getTime() + FIRST_AFTER_DAYS * DAY_MS;
    if (now.getTime() < dueAt) continue;

    // Claim this reminder first so overlapping runs can't send it twice.
    const claim = await prisma.sellerProfile.updateMany({
      where: { id: seller.id, setupRemindersSent: seller.setupRemindersSent },
      data: { setupRemindersSent: { increment: 1 }, lastSetupReminderAt: now },
    });
    if (claim.count === 0) continue;

    const steps = READINESS_STEPS.filter((step) => missing.includes(step.key));
    const message =
      steps.length === 1
        ? `One thing left before buyers can order from you: ${steps[0].title.toLowerCase()}.`
        : `${steps.length} things left before buyers can order from you: ${steps.map((step) => step.title.toLowerCase()).join(", ")}.`;

    await Promise.allSettled([
      createNotificationService(seller.user.id, "Finish setting up your store", message, NotificationType.SYSTEM, {
        type: "SELLER_SETUP",
        id: seller.id,
      }),
      sendEmail(
        seller.user.email,
        "Finish setting up your Nestly store",
        setupReminderTemplate(
          seller.user.name,
          steps.map((step) => ({ title: step.title, why: step.why, url: `${frontend()}${step.path}` })),
          `${frontend()}/settings/marketplace`
        )
      ),
    ]).then((results) =>
      results.forEach((result) => {
        if (result.status === "rejected") console.error(`Setup reminder to ${seller.user.id} failed:`, result.reason);
      })
    );
    sent += 1;
  }

  return sent;
};
