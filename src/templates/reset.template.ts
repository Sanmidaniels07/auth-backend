import { renderEmailLayout, emailButton, emailNotice, emailFinePrintLink } from "./base.template";

export const resetTemplate = (name: string, resetUrl: string) =>
  renderEmailLayout({
    preheader: "Reset your Nestly password - this link expires in 15 minutes.",
    eyebrow: "Password reset",
    heading: `Reset your password, ${name}`,
    bodyHtml: `
      <p style="margin:0;">
        We received a request to reset the password on your Nestly account.
        Click below to choose a new one.
      </p>
      ${emailButton("Reset my password", resetUrl)}
      <p style="margin:0; font-size:13px; color:#94A3B8;">
        This link expires in 15 minutes for your security.
      </p>
      ${emailFinePrintLink(resetUrl)}
      ${emailNotice(
        "If you didn't request a password reset, you can safely ignore this email - your password won't be changed.",
        "warning"
      )}
    `,
  });
