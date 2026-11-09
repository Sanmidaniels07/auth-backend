import { NotificationType, SellerStatus } from "@prisma/client";

import prisma from "../prisma/prisma";
import { createNotificationService } from "../modules/notification/notification.service";
import { sendEmail } from "../modules/auth/email.services";
import { emailButton, emailNotice, renderEmailLayout } from "../templates/base.template";
import {
  PERISHABLE_REPORT_HOURS,
  RETURN_POLICY_EFFECTIVE_AT,
  RETURN_WINDOW_DAYS,
} from "../modules/order/order-delivery";

// One-off: tells sellers who joined before the returns policy changed that
// the Seller Agreement was updated. Each seller is told once (the version is
// the notification's targetId), so it's safe on every restart and instance.
const TARGET = "SELLER_AGREEMENT";
const VERSION = "2026-11-10-returns";
// Let the server finish booting before the first run.
const FIRST_RUN_DELAY_MS = 3 * 60 * 1000;

const effectiveDate = RETURN_POLICY_EFFECTIVE_AT.toLocaleDateString("en-NG", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Lagos",
});

const MESSAGE =
  `We've updated the Seller Agreement. From ${effectiveDate}, buyers have ${RETURN_WINDOW_DAYS} days after delivery ` +
  `(${PERISHABLE_REPORT_HOURS} hours for food, cakes and groceries) to report an item that's damaged, spoiled, wrong or ` +
  `not as described - no change-of-mind returns. Nestly's policy now applies to every store, so store return policies are no longer shown.`;

const emailHtml = (name: string, termsUrl: string) =>
  renderEmailLayout({
    preheader: "Our Seller Agreement has been updated",
    eyebrow: "Seller Agreement",
    heading: "An update to how returns work",
    bodyHtml: `
      <p style="margin:0;">Hi ${name.replace(/[<>&"]/g, "")}, we've updated Nestly's Seller Agreement. Here's what changes from <strong>${effectiveDate}</strong>:</p>
      <ul style="margin:16px 0 0 0; padding-left:20px; line-height:1.7;">
        <li>Buyers can only report items that are <strong>damaged, spoiled, the wrong item, faulty or not as described</strong> - no change-of-mind returns.</li>
        <li>They have <strong>${RETURN_WINDOW_DAYS} days</strong> after delivery to report a problem.</li>
        <li>For <strong>food, cakes and groceries</strong> it's <strong>${PERISHABLE_REPORT_HOURS} hours</strong>, with a photo - the item isn't sent back.</li>
        <li>One Nestly policy applies to every store, so your store's own return policy is no longer shown to buyers.</li>
      </ul>
      ${emailNotice("Orders delivered before this date keep the old 7-day window. By continuing to sell on Nestly you accept the updated agreement.")}
      ${emailButton("Read the Seller Agreement", termsUrl)}
    `,
  });

export const sendSellerAgreementUpdate = async () => {
  const sellers = await prisma.sellerProfile.findMany({
    where: {
      status: SellerStatus.APPROVED,
      // Sellers who sign up after the change accept the new agreement then.
      createdAt: { lt: RETURN_POLICY_EFFECTIVE_AT },
      user: { deletedAt: null },
    },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  if (sellers.length === 0) return 0;

  const already = await prisma.notification.findMany({
    where: { targetType: TARGET, targetId: VERSION, userId: { in: sellers.map((s) => s.user.id) } },
    select: { userId: true },
  });
  const told = new Set(already.map((n) => n.userId));
  const termsUrl = `${process.env.FRONTEND_URL ?? ""}/seller-terms#returns`;

  let count = 0;
  for (const { user } of sellers) {
    if (told.has(user.id)) continue;
    await createNotificationService(user.id, "Seller Agreement updated", MESSAGE, NotificationType.SYSTEM, {
      type: TARGET,
      id: VERSION,
    });
    await sendEmail(user.email, "We've updated Nestly's Seller Agreement", emailHtml(user.name, termsUrl)).catch((error) =>
      console.error(`Seller Agreement email to ${user.id} failed:`, error)
    );
    count++;
  }
  return count;
};

export const startSellerAgreementUpdateJob = () => {
  setTimeout(() => {
    sendSellerAgreementUpdate()
      .then((count) => {
        if (count > 0) console.log(`Told ${count} seller(s) about the updated Seller Agreement.`);
      })
      .catch((error) => console.error("Seller Agreement update notifications failed:", error));
  }, FIRST_RUN_DELAY_MS).unref();
};
