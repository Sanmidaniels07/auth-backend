import { emailButton, renderEmailLayout } from "./base.template";

// Buyer-facing shopping emails (cart reminder, back in stock). Both are
// "Shopping updates" - users turn them off in Settings -> Notifications.

const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const optOut = (settingsUrl: string) => `
  <p style="margin:22px 0 0 0; font-size:12px; line-height:1.6; color:#94A3B8;">
    You're getting this because Shopping updates are on.
    <a href="${settingsUrl}" style="color:#6D28D9;">Turn them off</a> any time.
  </p>`;

export interface CartReminderLine {
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

export const cartReminderEmail = (opts: { name: string; lines: CartReminderLine[]; more: number; cartUrl: string; settingsUrl: string }) =>
  renderEmailLayout({
    preheader: "The items in your Nestly cart are waiting for you",
    eyebrow: "Your cart",
    heading: "You left something behind",
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, these are still in your cart - sellers can sell out, so finish checking out while they&apos;re available.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px; border-collapse:collapse;">
        ${opts.lines
          .map(
            (line) => `
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #EEF0F4; width:56px;">
              ${line.imageUrl ? `<img src="${escapeHtml(line.imageUrl)}" width="48" height="48" alt="" style="display:block; border-radius:10px; object-fit:cover;" />` : ""}
            </td>
            <td style="padding:10px 12px; border-bottom:1px solid #EEF0F4; font-size:14px; color:#13131A;">
              ${escapeHtml(line.title)}${line.quantity > 1 ? ` <span style="color:#94A3B8;">&times; ${line.quantity}</span>` : ""}
            </td>
            <td align="right" style="padding:10px 0; border-bottom:1px solid #EEF0F4; font-size:14px; color:#13131A; white-space:nowrap;">${naira(line.price * line.quantity)}</td>
          </tr>`
          )
          .join("")}
      </table>
      ${opts.more > 0 ? `<p style="margin:10px 0 0 0; font-size:13px; color:#64748B;">+ ${opts.more} more item${opts.more === 1 ? "" : "s"}</p>` : ""}
      ${emailButton("Go to my cart", opts.cartUrl)}
      ${optOut(opts.settingsUrl)}
    `,
  });

export const backInStockEmail = (opts: {
  name: string;
  productTitle: string;
  storeName: string;
  price: number;
  imageUrl?: string | null;
  productUrl: string;
  settingsUrl: string;
}) =>
  renderEmailLayout({
    preheader: `${opts.productTitle} is back in stock`,
    eyebrow: "Back in stock",
    heading: "It's back!",
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, good news - something you asked us to watch is available again.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px;">
        <tr>
          ${opts.imageUrl ? `<td style="width:84px; vertical-align:top;"><img src="${escapeHtml(opts.imageUrl)}" width="72" height="72" alt="" style="display:block; border-radius:12px; object-fit:cover;" /></td>` : ""}
          <td style="vertical-align:top; font-size:14px; line-height:1.55; color:#13131A;">
            <strong>${escapeHtml(opts.productTitle)}</strong><br />
            <span style="color:#64748B;">from ${escapeHtml(opts.storeName)}</span><br />
            <span style="font-weight:600;">${naira(opts.price)}</span>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0 0; font-size:13px; color:#64748B;">Stock can go quickly - grab it before it sells out again.</p>
      ${emailButton("View it on Nestly", opts.productUrl)}
      ${optOut(opts.settingsUrl)}
    `,
  });
