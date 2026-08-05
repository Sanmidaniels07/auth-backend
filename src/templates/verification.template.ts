import { renderEmailLayout, emailButton, emailFinePrintLink } from "./base.template";

export const verificationTemplate = (name: string, verificationUrl: string) =>
  renderEmailLayout({
    preheader: "Verify your email to finish setting up your Nestly account.",
    eyebrow: "Confirm your email",
    heading: `Welcome, ${name}`,
    bodyHtml: `
      <p style="margin:0;">
        Thanks for signing up for Nestly. Confirm your email address to
        activate your account and start posting, connecting, and selling.
      </p>
      ${emailButton("Verify my email", verificationUrl)}
      <p style="margin:0; font-size:13px; color:#94A3B8;">
        This link expires in 24 hours. If you didn't create a Nestly
        account, you can safely ignore this email.
      </p>
      ${emailFinePrintLink(verificationUrl)}
    `,
  });
