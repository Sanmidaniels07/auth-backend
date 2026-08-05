import { renderEmailLayout, emailButton, emailNotice } from "./base.template";

export const payoutAccountChangedTemplate = (
  name: string,
  storeName: string,
  bankName: string,
  maskedAccountNumber: string,
  accountUrl: string
) =>
  renderEmailLayout({
    preheader: `Payout account updated for ${storeName}.`,
    eyebrow: "Security alert",
    heading: "Payout account changed",
    bodyHtml: `
      <p style="margin:0;">
        Hi ${name}, the payout bank account for your store
        <strong style="color:#13131A;">${storeName}</strong> was just
        changed to:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0; border-radius:14px; background-color:#FAFAFD; border:1px solid #ECE9F6;">
        <tr>
          <td style="padding:14px 16px; font-size:14px; color:#13131A;">
            <strong>${bankName}</strong><br />
            <span style="font-family:'SFMono-Regular', Consolas, monospace; color:#64748B;">${maskedAccountNumber}</span>
          </td>
        </tr>
      </table>
      <p style="margin:0;">
        As a security measure, automatic payouts to this account are paused
        for up to 48 hours. Earnings from before then keep accruing and
        will be paid out manually in the meantime.
      </p>
      ${emailButton("Review payout settings", accountUrl)}
      ${emailNotice(
        "If this wasn't you, contact support immediately - your account may be compromised.",
        "warning"
      )}
    `,
  });
