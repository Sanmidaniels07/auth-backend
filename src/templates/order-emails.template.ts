import { emailButton, emailNotice, renderEmailLayout } from "./base.template";

export interface EmailOrderLine {
  title: string;
  quantity: number;
  totalPrice: number;
}

const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const itemsTable = (lines: EmailOrderLine[], total?: number) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px; border-collapse:collapse;">
    ${lines
      .map(
        (line) => `
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #F2F1F8; font-size:14px; color:#13131A;">
          ${escapeHtml(line.title)} <span style="color:#94A3B8;">× ${line.quantity}</span>
        </td>
        <td align="right" style="padding:10px 0; border-bottom:1px solid #F2F1F8; font-size:14px; color:#13131A; white-space:nowrap;">
          ${naira(line.totalPrice)}
        </td>
      </tr>`
      )
      .join("")}
    ${
      total !== undefined
        ? `<tr>
        <td style="padding:12px 0 0 0; font-size:14px; font-weight:600; color:#13131A;">Total</td>
        <td align="right" style="padding:12px 0 0 0; font-size:14px; font-weight:600; color:#13131A;">${naira(total)}</td>
      </tr>`
        : ""
    }
  </table>
`;

const codeBlock = (storeName: string, code: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px; border-radius:14px; background-color:#F6F3FF; border:1px solid #DDD6FE;">
    <tr>
      <td style="padding:14px 16px; font-size:13px; color:#475569;">
        Delivery code for <strong style="color:#13131A;">${escapeHtml(storeName)}</strong>
        <div style="margin-top:6px; font-family:Consolas, Menlo, monospace; font-size:24px; font-weight:700; letter-spacing:6px; color:#6D28D9;">${code}</div>
      </td>
    </tr>
  </table>
`;

export const orderConfirmedEmail = (opts: {
  name: string;
  orderNumber: string;
  lines: EmailOrderLine[];
  total: number;
  codes: { storeName: string; code: string }[];
  orderUrl: string;
}) =>
  renderEmailLayout({
    preheader: `Order ${opts.orderNumber} is confirmed`,
    eyebrow: "Order confirmed",
    heading: "Thanks for your order",
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, your payment went through and order <strong>${opts.orderNumber}</strong> is confirmed. The seller has been notified and will start preparing it.</p>
      ${itemsTable(opts.lines, opts.total)}
      ${
        opts.codes.length
          ? `<p style="margin:24px 0 0 0; font-size:14px;">When your items arrive, give the delivery person the code for that seller. <strong>Only share it once you have your items</strong> - it confirms you received them.</p>
             ${opts.codes.map((c) => codeBlock(c.storeName, c.code)).join("")}`
          : ""
      }
      ${emailButton("View your order", opts.orderUrl)}
    `,
  });

export const newOrderEmail = (opts: {
  sellerName: string;
  storeName: string;
  orderNumber: string;
  lines: EmailOrderLine[];
  subtotal: number;
  shippingOption: string | null;
  ordersUrl: string;
}) =>
  renderEmailLayout({
    preheader: `New order ${opts.orderNumber} for ${opts.storeName}`,
    eyebrow: "New order",
    heading: "You've got a new order",
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.sellerName)}, a buyer just paid for order <strong>${opts.orderNumber}</strong> from <strong>${escapeHtml(opts.storeName)}</strong>.</p>
      ${itemsTable(opts.lines, opts.subtotal)}
      ${opts.shippingOption ? `<p style="margin:16px 0 0 0; font-size:13px; color:#64748B;">Delivery option chosen: ${escapeHtml(opts.shippingOption)}</p>` : ""}
      ${emailNotice("At handover, ask the buyer for their 6-digit delivery code and enter it when you mark the order delivered. That confirms delivery instantly.")}
      ${emailButton("Manage this order", opts.ordersUrl)}
    `,
  });

export const orderShippedEmail = (opts: { name: string; orderNumber: string; storeName: string; lines: EmailOrderLine[]; orderUrl: string }) =>
  renderEmailLayout({
    preheader: `Order ${opts.orderNumber} is on its way`,
    eyebrow: "On its way",
    heading: "Your order has shipped",
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, <strong>${escapeHtml(opts.storeName)}</strong> has sent out items from order <strong>${opts.orderNumber}</strong>.</p>
      ${itemsTable(opts.lines)}
      ${emailNotice("Keep your delivery code handy - you'll find it on your order page. Only share it once your items are in your hands.")}
      ${emailButton("Track your order", opts.orderUrl)}
    `,
  });

export const orderDeliveredEmail = (opts: {
  name: string;
  orderNumber: string;
  storeName: string;
  lines: EmailOrderLine[];
  confirmed: boolean;
  autoConfirmDays: number;
  returnWindowDays: number;
  orderUrl: string;
}) =>
  renderEmailLayout({
    preheader: opts.confirmed ? `Order ${opts.orderNumber} delivered` : `Did you receive order ${opts.orderNumber}?`,
    eyebrow: opts.confirmed ? "Delivered" : "Please confirm",
    heading: opts.confirmed ? "Your order was delivered" : "Did your order arrive?",
    bodyHtml: opts.confirmed
      ? `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, your items from <strong>${escapeHtml(opts.storeName)}</strong> (order <strong>${opts.orderNumber}</strong>) were delivered and confirmed with your delivery code.</p>
      ${itemsTable(opts.lines)}
      ${emailNotice(`Something wrong? You can request a return within ${opts.returnWindowDays} days from your order page.`)}
      ${emailButton("View order", opts.orderUrl)}
    `
      : `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, <strong>${escapeHtml(opts.storeName)}</strong> marked items from order <strong>${opts.orderNumber}</strong> as delivered.</p>
      ${itemsTable(opts.lines)}
      ${emailNotice(`Please confirm you received them, or report a problem if you didn't. If we don't hear from you, delivery is confirmed automatically after ${opts.autoConfirmDays} days.`, "warning")}
      ${emailButton("Confirm or report a problem", opts.orderUrl)}
    `,
  });

export const itemCancelledEmail = (opts: { name: string; orderNumber: string; storeName: string; lines: EmailOrderLine[]; orderUrl: string }) =>
  renderEmailLayout({
    preheader: `Part of order ${opts.orderNumber} was cancelled`,
    eyebrow: "Order update",
    heading: "An item was cancelled",
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, <strong>${escapeHtml(opts.storeName)}</strong> cancelled the following from order <strong>${opts.orderNumber}</strong>.</p>
      ${itemsTable(opts.lines)}
      ${emailNotice("If you were charged for these items, contact support from your order page and we'll sort out your refund.")}
      ${emailButton("View order", opts.orderUrl)}
    `,
  });

export const problemReportedEmail = (opts: { sellerName: string; orderNumber: string; itemTitle: string; reason: string; returnsUrl: string }) =>
  renderEmailLayout({
    preheader: `A buyer reported a problem with order ${opts.orderNumber}`,
    eyebrow: "Action needed",
    heading: "A buyer reported a problem",
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.sellerName)}, the buyer of <strong>${escapeHtml(opts.itemTitle)}</strong> (order <strong>${opts.orderNumber}</strong>) opened a request:</p>
      ${emailNotice(escapeHtml(opts.reason), "warning")}
      ${emailButton("Review the request", opts.returnsUrl)}
    `,
  });
