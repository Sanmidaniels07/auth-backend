import { NotificationType, Role } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { createNotificationService } from "../notification/notification.service";
import { buyerReturnsUrl, deliver, safely, sellerReturnsUrl, titleOf, USER_SELECT } from "../order/order-notifications";
import { orderNumber } from "../order/order-delivery";
import { naira, simpleEmail } from "../../templates/payout-emails.template";

// Who hears about each step of a problem report. Buyers land on their
// reports (My returns), sellers on their Returns tab, admins on the disputes list.

export type ReturnEvent =
  | "OPENED" // buyer reported a problem
  | "REFUNDED" // refund sent to Paystack (by the seller's or Nestly's decision)
  | "REFUND_MANUAL" // refund agreed but Nestly must send it by hand
  | "REPLACEMENT" // seller is sending a replacement
  | "SELLER_DISAGREED"
  | "ESCALATED" // seller didn't answer in time
  | "KEPT" // buyer chose to keep the item
  | "REPLACED" // replacement received (or auto-closed)
  | "REPLACEMENT_PROBLEM"
  | "REJECTED"; // Nestly decided in the seller's favour

const when = (date: Date | null) =>
  date
    ? date.toLocaleString("en-NG", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "soon";

const loadRequest = (id: string) =>
  prisma.returnRequest.findUnique({
    where: { id },
    select: {
      id: true,
      orderId: true,
      reason: true,
      sellerResponse: true,
      sellerRespondBy: true,
      resolutionNote: true,
      refundAmount: true,
      user: { select: USER_SELECT },
      orderItem: {
        select: {
          productTitle: true,
          product: { select: { title: true, store: { select: { name: true, seller: { select: { user: { select: USER_SELECT } } } } } } },
        },
      },
    },
  });

type Loaded = NonNullable<Awaited<ReturnType<typeof loadRequest>>>;

interface Message {
  title: string;
  message: string;
}

const notifyAdmins = async ({ title, message }: Message, id: string) => {
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN, deletedAt: null }, select: { id: true } });
  await Promise.allSettled(
    admins.map((admin) => createNotificationService(admin.id, title, message, NotificationType.SYSTEM, { type: "ADMIN_DISPUTE", id }))
  );
};

const messagesFor = (event: ReturnEvent, r: Loaded) => {
  const item = r.orderItem ? `"${titleOf(r.orderItem)}"` : "an item";
  const number = orderNumber(r.orderId);
  const store = r.orderItem?.product.store.name ?? "the seller";
  const amount = r.refundAmount ? naira(r.refundAmount) : "your money";
  const sellerNote = r.sellerResponse ? ` They said: "${r.sellerResponse}"` : "";
  const nestlyNote = r.resolutionNote ? ` Note from Nestly: "${r.resolutionNote}"` : "";

  const out: { buyer?: Message; seller?: Message; admins?: Message } = {};
  switch (event) {
    case "OPENED":
      out.seller = {
        title: "Buyer reported a problem",
        message: `The buyer of ${item} (order ${number}) reported: "${r.reason}". Please answer by ${when(r.sellerRespondBy)} - refund, send a replacement, or tell us why you disagree. Your payout for this order is on hold until it's sorted.`,
      };
      break;
    case "REFUNDED":
      out.buyer = {
        title: "Refund on its way",
        message: `We're refunding ${amount} for ${item} (order ${number}). It goes back to the card or account you paid with, usually within 5-10 business days.${nestlyNote}`,
      };
      out.seller = { title: "Refund issued", message: `${amount} was refunded to the buyer for ${item} (order ${number}).${nestlyNote}` };
      break;
    case "REFUND_MANUAL":
      out.buyer = {
        title: "Refund approved",
        message: `Your refund of ${amount} for ${item} (order ${number}) is approved. Our team will send it shortly and let you know.`,
      };
      out.seller = { title: "Refund approved", message: `The buyer of ${item} (order ${number}) is being refunded ${amount}.` };
      out.admins = {
        title: "Refund needed",
        message: `Send ${amount} back to the buyer of ${item} (order ${number}) by hand - this order was paid through a split, so the seller already has the money.`,
      };
      break;
    case "REPLACEMENT":
      out.buyer = {
        title: "A replacement is coming",
        message: `${store} is sending you a replacement for ${item} (order ${number}).${sellerNote} When it arrives, open My returns and tap "Got the replacement".`,
      };
      break;
    case "SELLER_DISAGREED":
      out.buyer = {
        title: "Nestly is reviewing your report",
        message: `${store} disagreed with your report about ${item} (order ${number}).${sellerNote} Our team will look at both sides and decide within 2 business days.`,
      };
      out.admins = { title: "Dispute to decide", message: `${store} disagreed with a report on ${item} (order ${number}).${sellerNote}` };
      break;
    case "ESCALATED":
      out.buyer = {
        title: "Nestly is reviewing your report",
        message: `${store} didn't answer your report about ${item} (order ${number}) in time, so our team will decide within 2 business days.`,
      };
      out.seller = {
        title: "Report passed to Nestly",
        message: `You didn't answer the report on ${item} (order ${number}) in time, so Nestly will decide. You can still message the buyer.`,
      };
      out.admins = { title: "Dispute to decide", message: `${store} didn't answer a report on ${item} (order ${number}) in time.` };
      break;
    case "KEPT":
      out.seller = {
        title: "Report closed",
        message: `The buyer chose to keep ${item} (order ${number}), so the report is closed and your payout for it is back on track.`,
      };
      break;
    case "REPLACED":
      out.seller = {
        title: "Replacement received",
        message: `The replacement for ${item} (order ${number}) is done, so the report is closed and your payout for it is back on track.`,
      };
      break;
    case "REPLACEMENT_PROBLEM":
      out.seller = {
        title: "Problem with the replacement",
        message: `The buyer reported a problem with the replacement for ${item} (order ${number}): "${r.reason}". Nestly will decide.`,
      };
      out.admins = { title: "Dispute to decide", message: `Problem with a replacement from ${store} for ${item} (order ${number}).` };
      break;
    case "REJECTED":
      out.buyer = {
        title: "Report closed",
        message: `We looked into your report about ${item} (order ${number}) and couldn't approve a refund.${nestlyNote}`,
      };
      out.seller = {
        title: "Report closed in your favour",
        message: `Nestly closed the report on ${item} (order ${number}) in your favour - your payout for it is back on track.${nestlyNote}`,
      };
      break;
  }
  return out;
};

export const notifyReturnEvent = (returnRequestId: string, event: ReturnEvent) =>
  safely(`Return ${event} notification`, async () => {
    const request = await loadRequest(returnRequestId);
    if (!request) return;
    const { buyer, seller, admins } = messagesFor(event, request);
    const number = orderNumber(request.orderId);

    await Promise.allSettled([
      buyer &&
        deliver({
          to: request.user,
          ...buyer,
          target: { type: "MY_RETURNS", id: request.id },
          email: {
            subject: `${buyer.title} - order ${number}`,
            html: simpleEmail({
              preheader: buyer.message.slice(0, 90),
              eyebrow: "Your report",
              heading: buyer.title,
              paragraphs: [`Hi ${request.user.name},`, buyer.message],
              button: { label: "View your report", url: buyerReturnsUrl() },
            }),
          },
        }),
      seller &&
        request.orderItem &&
        deliver({
          to: request.orderItem.product.store.seller.user,
          ...seller,
          target: { type: "SELLER_RETURNS", id: request.id },
          email: {
            subject: `${seller.title} - order ${number}`,
            html: simpleEmail({
              preheader: seller.message.slice(0, 90),
              eyebrow: event === "OPENED" ? "Action needed" : "Returns",
              heading: seller.title,
              paragraphs: [`Hi ${request.orderItem.product.store.seller.user.name},`, seller.message],
              button: { label: event === "OPENED" ? "Answer the report" : "View returns", url: sellerReturnsUrl() },
            }),
          },
        }),
      admins && notifyAdmins(admins, request.id),
    ]);
  });
