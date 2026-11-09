import { GiftStatus, NotificationType, Role } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { createNotificationService } from "../notification/notification.service";
import { USER_SELECT, deliver, frontend, notifyOrderPaid, safely } from "../order/order-notifications";
import { giftReadyEmail, giftReceivedEmail } from "../../templates/gift-emails.template";
import { GIFT_CLAIM_DAYS } from "../../utils/giftOrders";

// Gift alerts: the sender gets their link and later hears whether it was
// accepted; a recipient on Nestly is told a gift is waiting. Fire-and-forget,
// like every order alert.

const giftUrl = (code: string) => `${frontend()}/gift/${code}`;

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

const loadGift = (orderId: string) =>
  prisma.gift.findUnique({
    where: { orderId },
    include: {
      sender: { select: USER_SELECT },
      recipient: { select: USER_SELECT },
      order: {
        select: {
          id: true,
          total: true,
          paymentReference: true,
          items: { select: { productTitle: true, product: { select: { title: true } } }, take: 1 },
        },
      },
    },
  });

const itemTitleOf = (gift: NonNullable<Awaited<ReturnType<typeof loadGift>>>) =>
  gift.order.items[0]?.productTitle ?? gift.order.items[0]?.product.title ?? "your gift";

/** Payment went through: the sender gets the link to share, the recipient a heads-up. */
export const notifyGiftSent = (orderId: string) =>
  safely("Gift sent notifications", async () => {
    const gift = await loadGift(orderId);
    if (!gift) return;

    const url = giftUrl(gift.code);
    const item = itemTitleOf(gift);

    await deliver({
      to: gift.sender,
      title: "Your gift is ready to send 🎁",
      message: gift.recipient
        ? `Payment received. We've told ${gift.recipientName} - they add their own delivery address. You can also share the gift link.`
        : `Payment received. Share your gift link with ${gift.recipientName} so they can add their delivery address.`,
      target: { type: "GIFT", id: gift.code },
      email: {
        subject: `Your gift for ${gift.recipientName} is ready`,
        html: giftReadyEmail({
          name: firstName(gift.sender.name),
          recipientName: gift.recipientName,
          itemTitle: item,
          showPrice: gift.showPrice,
          recipientNotified: !!gift.recipient,
          claimDays: GIFT_CLAIM_DAYS,
          giftUrl: url,
        }),
      },
    });

    if (gift.recipient) {
      await deliver({
        to: gift.recipient,
        title: `${gift.sender.name} sent you a gift 🎁`,
        message: `${gift.sender.name} sent you a gift! Open it to add your delivery address.`,
        target: { type: "GIFT", id: gift.code },
        email: {
          subject: `${gift.sender.name} sent you a gift on Nestly 🎁`,
          html: giftReceivedEmail({
            name: firstName(gift.recipient.name),
            senderName: gift.sender.name,
            message: gift.message,
            giftUrl: url,
          }),
        },
      });
    }
  });

/** The recipient accepted: the sender hears, and the seller gets the order. */
export const notifyGiftClaimed = (orderId: string) =>
  safely("Gift claimed notifications", async () => {
    const gift = await loadGift(orderId);
    if (!gift) return;

    const name = gift.recipient?.name ?? gift.recipientName;
    await deliver({
      to: gift.sender,
      title: `${firstName(name)} accepted your gift 🎉`,
      message: `${name} accepted your gift and added their delivery details. The seller is preparing it now.`,
      target: { type: "GIFT", id: gift.code },
    });

    notifyOrderPaid(orderId, { buyer: false });
  });

const CLOSED_COPY: Partial<Record<GiftStatus, (name: string) => string>> = {
  [GiftStatus.DECLINED]: (name) => `${name} declined the gift`,
  [GiftStatus.EXPIRED]: (name) => `${name} didn't accept the gift within ${GIFT_CLAIM_DAYS} days`,
  [GiftStatus.CANCELLED]: () => "You cancelled the gift",
};

/**
 * Declined, unclaimed or cancelled: the sender hears they're being refunded.
 * If Paystack refused the refund, admins are asked to do it by hand.
 */
export const notifyGiftClosed = (orderId: string, status: GiftStatus, refunded: boolean) =>
  safely("Gift closed notifications", async () => {
    const gift = await loadGift(orderId);
    if (!gift) return;

    const what = (CLOSED_COPY[status] ?? (() => "The gift was cancelled"))(gift.recipient?.name ?? gift.recipientName);
    const money = naira(gift.order.total);

    await deliver({
      to: gift.sender,
      title: refunded ? "Gift refunded" : "Gift cancelled - refund coming",
      message: refunded
        ? `${what}, so we've refunded ${money} to you. It can take a few days to show.`
        : `${what}. Our team will refund your ${money} shortly.`,
      target: { type: "GIFT", id: gift.code },
    });

    if (refunded) return;

    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN, deletedAt: null }, select: { id: true } });
    await Promise.allSettled(
      admins.map((admin) =>
        createNotificationService(
          admin.id,
          "Refund needed",
          `A gift (${gift.code}) was ${status.toLowerCase()} but the automatic refund failed. Refund ${money} to ${gift.sender.email} in Paystack (reference ${gift.order.paymentReference}).`,
          NotificationType.SYSTEM,
          { type: "ADMIN_REFUND_NEEDED", id: gift.order.id }
        )
      )
    );
  });
