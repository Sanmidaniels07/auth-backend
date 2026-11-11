import { NotificationType, SellerStatus } from "@prisma/client";

import prisma from "../prisma/prisma";
import { createNotificationService } from "../modules/notification/notification.service";
import { sendEmail } from "../modules/auth/email.services";
import { emailButton, emailNotice, renderEmailLayout } from "../templates/base.template";
import { holdPayoutsEnabled } from "../utils/payoutMode";

// One-off: once hold-then-pay is switched on (PAYOUTS_HOLD), tells every
// approved seller how they're paid now. Each seller is told once (the
// version is the notification's targetId), so it's safe on every restart
// and instance. Nothing is sent while the switch is off.
const TARGET = "SELLER_AGREEMENT";
const VERSION = "2026-11-payouts-after-return-window";
const FIRST_RUN_DELAY_MS = 4 * 60 * 1000;

const MESSAGE =
  "We've updated the Seller Agreement: Nestly now holds each order's payment until the buyer has the item and the " +
  "return window has closed (3 days after delivery is confirmed, 24 hours for perishables), then pays it to your bank. " +
  "If a buyer reports a problem, answer within 48 hours (24 for perishables) - refund, send a replacement, or tell us " +
  "why you disagree. That order's payout waits until it's sorted.";

const emailHtml = (name: string, termsUrl: string) =>
  renderEmailLayout({
    preheader: "How you get paid on Nestly has changed",
    eyebrow: "Seller Agreement",
    heading: "An update to how you get paid",
    bodyHtml: `
      <p style="margin:0;">Hi ${name.replace(/[<>&"]/g, "")}, we've updated Nestly's Seller Agreement. Here's what changes for new orders:</p>
      <ul style="margin:16px 0 0 0; padding-left:20px; line-height:1.7;">
        <li>Nestly holds the payment until the buyer has the item and the <strong>return window has closed</strong> - 3 days after delivery is confirmed, <strong>24 hours</strong> for food, cakes and groceries.</li>
        <li>Then your share (price minus commission, plus your delivery fee) is <strong>paid to your bank account</strong>. Check what's coming any time under Seller Hub &rarr; Earnings.</li>
        <li>If a buyer reports a problem, answer within <strong>48 hours</strong> (24 for perishables): refund them, send a replacement, or tell us why you disagree and Nestly decides.</li>
        <li>That order's payout waits until the report is closed. There are no partial refunds - it's a refund or a replacement.</li>
      </ul>
      ${emailNotice("This protects you and buyers alike: refunds come from money Nestly is still holding, so nothing is ever taken back from your bank account. By continuing to sell on Nestly you accept the updated agreement.")}
      ${emailButton("Read the Seller Agreement", termsUrl)}
    `,
  });

export const sendPayoutTermsUpdate = async () => {
  if (!holdPayoutsEnabled()) return 0;

  const sellers = await prisma.sellerProfile.findMany({
    where: { status: SellerStatus.APPROVED, user: { deletedAt: null } },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  if (sellers.length === 0) return 0;

  const already = await prisma.notification.findMany({
    where: { targetType: TARGET, targetId: VERSION, userId: { in: sellers.map((s) => s.user.id) } },
    select: { userId: true },
  });
  const told = new Set(already.map((n) => n.userId));
  const termsUrl = `${process.env.FRONTEND_URL ?? ""}/seller-terms#payouts`;

  let count = 0;
  for (const { user } of sellers) {
    if (told.has(user.id)) continue;
    await createNotificationService(user.id, "How you get paid has changed", MESSAGE, NotificationType.SYSTEM, {
      type: TARGET,
      id: VERSION,
    });
    await sendEmail(user.email, "An update to how you get paid on Nestly", emailHtml(user.name, termsUrl)).catch((error) =>
      console.error(`Payout terms email to ${user.id} failed:`, error)
    );
    count++;
  }
  return count;
};

export const startPayoutTermsUpdateJob = () => {
  setTimeout(() => {
    sendPayoutTermsUpdate()
      .then((count) => {
        if (count > 0) console.log(`Told ${count} seller(s) about the new payout terms.`);
      })
      .catch((error) => console.error("Payout terms notifications failed:", error));
  }, FIRST_RUN_DELAY_MS).unref();
};
