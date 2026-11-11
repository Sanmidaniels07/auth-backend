import { emailButton, emailNotice, renderEmailLayout } from "./base.template";

// Emails for hold-then-pay payouts and the returns (problem report) flow.

export const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface SimpleEmail {
  preheader: string;
  eyebrow: string;
  heading: string;
  // Plain text paragraphs (escaped here).
  paragraphs: string[];
  notice?: { text: string; tone?: "warning" };
  button?: { label: string; url: string };
}

export const simpleEmail = ({ preheader, eyebrow, heading, paragraphs, notice, button }: SimpleEmail) =>
  renderEmailLayout({
    preheader,
    eyebrow,
    heading,
    bodyHtml: `
      ${paragraphs.map((text) => `<p style="margin:0 0 12px;">${escapeHtml(text)}</p>`).join("")}
      ${notice ? emailNotice(escapeHtml(notice.text), notice.tone) : ""}
      ${button ? emailButton(button.label, button.url) : ""}
    `,
  });

export const payoutSentEmail = (opts: { name: string; amount: number; bankLabel: string; orderCount: number; earningsUrl: string }) =>
  simpleEmail({
    preheader: `${naira(opts.amount)} is on its way to your bank`,
    eyebrow: "Payout",
    heading: `${naira(opts.amount)} sent to your bank`,
    paragraphs: [
      `Hi ${opts.name}, we've paid ${naira(opts.amount)} to ${opts.bankLabel} for ${opts.orderCount} order${opts.orderCount === 1 ? "" : "s"} whose return window has closed.`,
      "Bank transfers usually arrive within minutes, occasionally a few hours.",
    ],
    button: { label: "See your earnings", url: opts.earningsUrl },
  });
