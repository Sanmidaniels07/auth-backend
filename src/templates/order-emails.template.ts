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

const codeBlock = (storeName: string, code: string, pickupAddress?: string | null) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px; border-radius:14px; background-color:#F6F3FF; border:1px solid #DDD6FE;">
    <tr>
      <td style="padding:14px 16px; font-size:13px; color:#475569;">
        ${pickupAddress ? "Pickup" : "Delivery"} code for <strong style="color:#13131A;">${escapeHtml(storeName)}</strong>
        <div style="margin-top:6px; font-family:Consolas, Menlo, monospace; font-size:24px; font-weight:700; letter-spacing:6px; color:#6D28D9;">${code}</div>
        ${pickupAddress ? `<div style="margin-top:8px;">Pick up at: <strong style="color:#13131A;">${escapeHtml(pickupAddress)}</strong></div>` : ""}
      </td>
    </tr>
  </table>
`;

export const orderConfirmedEmail = (opts: {
  name: string;
  orderNumber: string;
  lines: EmailOrderLine[];
  total: number;
  codes: { storeName: string; code: string; pickupAddress?: string | null }[];
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
          ? `<p style="margin:24px 0 0 0; font-size:14px;">When you get your items - delivered or picked up - give the seller the code for that seller. <strong>Only share it once you have your items</strong> - it confirms you received them.</p>
             ${opts.codes.map((c) => codeBlock(c.storeName, c.code, c.pickupAddress)).join("")}`
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
  isPickup?: boolean;
  buyerNote?: string | null;
  /** Delivery orders only - the seller delivers, so they get the number to call. */
  deliverTo?: { name: string; address: string; phone: string | null } | null;
  ordersUrl: string;
}) =>
  renderEmailLayout({
    preheader: `New order ${opts.orderNumber} for ${opts.storeName}`,
    eyebrow: "New order",
    heading: "You've got a new order",
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.sellerName)}, a buyer just paid for order <strong>${opts.orderNumber}</strong> from <strong>${escapeHtml(opts.storeName)}</strong>.</p>
      ${
        opts.buyerNote
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0 0;">
              <tr>
                <td style="padding:14px 16px; background:#F5F3FF; border-left:3px solid #7C3AED; border-radius:10px; font-size:14px; line-height:1.55; color:#13131A;">
                  <div style="font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#6D28D9; margin-bottom:6px;">Note from the buyer</div>
                  ${escapeHtml(opts.buyerNote).replace(/\n/g, "<br />")}
                </td>
              </tr>
            </table>`
          : ""
      }
      ${
        opts.deliverTo
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0 0;">
              <tr>
                <td style="padding:14px 16px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; font-size:14px; line-height:1.6; color:#13131A;">
                  <div style="font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#64748B; margin-bottom:6px;">Deliver to</div>
                  <strong>${escapeHtml(opts.deliverTo.name)}</strong><br />
                  ${escapeHtml(opts.deliverTo.address)}
                  ${opts.deliverTo.phone ? `<br />Phone: <a href="tel:${escapeHtml(opts.deliverTo.phone)}" style="color:#6D28D9; font-weight:600;">${escapeHtml(opts.deliverTo.phone)}</a>` : ""}
                  <div style="margin-top:8px; font-size:12px; color:#64748B;">For delivering this order only. Keep everything else - questions, extra orders and payment - on Nestly.</div>
                </td>
              </tr>
            </table>`
          : ""
      }
      ${itemsTable(opts.lines, opts.subtotal)}
      ${
        opts.isPickup
          ? `<p style="margin:16px 0 0 0; font-size:13px; color:#64748B;"><strong style="color:#13131A;">The buyer will pick this up from you.</strong> Mark it "Shipped" when it's ready - they'll be told it's ready for pickup.</p>`
          : opts.shippingOption
            ? `<p style="margin:16px 0 0 0; font-size:13px; color:#64748B;">Delivery option chosen: ${escapeHtml(opts.shippingOption)}</p>`
            : ""
      }
      ${emailNotice(`At handover, ask the buyer for their 6-digit code and enter it when you mark the order delivered${opts.isPickup ? " (picked up)" : ""}. That confirms it instantly.`)}
      ${emailButton("Manage this order", opts.ordersUrl)}
    `,
  });

export const orderShippedEmail = (opts: {
  name: string;
  orderNumber: string;
  storeName: string;
  lines: EmailOrderLine[];
  orderUrl: string;
  pickupAddress?: string | null;
}) =>
  opts.pickupAddress
    ? renderEmailLayout({
        preheader: `Order ${opts.orderNumber} is ready for pickup`,
        eyebrow: "Ready for pickup",
        heading: "Your order is ready to collect",
        bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, <strong>${escapeHtml(opts.storeName)}</strong> has your items from order <strong>${opts.orderNumber}</strong> ready.</p>
      ${itemsTable(opts.lines)}
      ${emailNotice(`Pick up at: <strong>${escapeHtml(opts.pickupAddress)}</strong>. Bring your 6-digit code from your order page and give it to the seller once you have your items.`)}
      ${emailButton("View order and code", opts.orderUrl)}
    `,
      })
    : renderEmailLayout({
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

export const soldOutRefundEmail = (opts: { name: string; orderNumber: string; reason: string; total: number; refunded: boolean; orderUrl: string }) =>
  renderEmailLayout({
    preheader: opts.refunded ? `We're refunding ${naira(opts.total)} for order ${opts.orderNumber}` : `About your payment for order ${opts.orderNumber}`,
    eyebrow: "Order update",
    heading: "Sorry, it sold out",
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, ${escapeHtml(opts.reason)} So we've cancelled order <strong>${opts.orderNumber}</strong> - nothing will be sent.</p>
      ${
        opts.refunded
          ? emailNotice(`Your ${naira(opts.total)} is on its way back to the card or account you paid with. Refunds usually arrive within 5-10 business days, depending on your bank.`)
          : emailNotice(`Our team will refund your ${naira(opts.total)} by hand and email you once it's sent. You don't need to do anything.`, "warning")
      }
      ${emailButton("View order", opts.orderUrl)}
    `,
  });
