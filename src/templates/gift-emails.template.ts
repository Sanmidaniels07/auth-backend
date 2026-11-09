import { emailButton, renderEmailLayout } from "./base.template";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** To the sender once they've paid: share the link. */
export const giftReadyEmail = (opts: {
  name: string;
  recipientName: string;
  itemTitle: string;
  showPrice: boolean;
  recipientNotified: boolean;
  claimDays: number;
  giftUrl: string;
}) =>
  renderEmailLayout({
    preheader: `Your gift for ${opts.recipientName} is ready`,
    eyebrow: "Gift ready",
    heading: `Your gift for ${escapeHtml(opts.recipientName)} is ready 🎁`,
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, your payment for <strong>${escapeHtml(opts.itemTitle)}</strong> went through.</p>
      <p style="margin:16px 0 0 0;">${
        opts.recipientNotified
          ? `We've told ${escapeHtml(opts.recipientName)} on Nestly.`
          : `Send ${escapeHtml(opts.recipientName)} the gift link below.`
      } They open it, see their gift and add their own delivery address - ${
        opts.showPrice ? "you chose to show them the price." : "they won't see the price."
      }</p>
      <p style="margin:16px 0 0 0; word-break:break-all;"><a href="${opts.giftUrl}" style="color:#6D28D9;">${opts.giftUrl}</a></p>
      <p style="margin:16px 0 0 0; font-size:14px; color:#475569;">If it isn't accepted within ${opts.claimDays} days, we refund you in full.</p>
      ${emailButton("Open the gift link", opts.giftUrl)}
    `,
  });

/** To a recipient who is on Nestly. */
export const giftReceivedEmail = (opts: { name: string; senderName: string; message: string | null; giftUrl: string }) =>
  renderEmailLayout({
    preheader: `${opts.senderName} sent you a gift`,
    eyebrow: "You have a gift",
    heading: `${escapeHtml(opts.senderName)} sent you a gift 🎁`,
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, <strong>${escapeHtml(opts.senderName)}</strong> sent you a gift on Nestly! Open it to see what it is and tell us where to deliver it.</p>
      ${
        opts.message
          ? `<p style="margin:16px 0 0 0; padding:14px 16px; border-radius:14px; background-color:#F6F3FF; font-style:italic;">"${escapeHtml(opts.message)}"</p>`
          : ""
      }
      ${emailButton("Open your gift", opts.giftUrl)}
    `,
  });
