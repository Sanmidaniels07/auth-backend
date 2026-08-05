import { renderEmailLayout, emailButton } from "./base.template";

export const welcomeTemplate = (name: string, appUrl: string) =>
  renderEmailLayout({
    preheader: "Your Nestly account is verified - here's where to start.",
    eyebrow: "You're in",
    heading: `Welcome to Nestly, ${name}`,
    bodyHtml: `
      <p style="margin:0;">
        Your email is verified and your account is ready. Nestly is where
        your feed, your community, and your storefront live in one place.
      </p>
      <ul style="margin:16px 0; padding-left:18px;">
        <li style="margin-bottom:8px;">Share posts and connect with people you follow</li>
        <li style="margin-bottom:8px;">Join communities built around your interests</li>
        <li>Open a store and start selling in the marketplace</li>
      </ul>
      ${emailButton("Go to Nestly", appUrl)}
    `,
  });
