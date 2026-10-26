import { renderEmailLayout, emailButton, emailNotice } from "./base.template";

// Nudge for sellers who joined without a CAC number. Optional - it earns
// their store the verified badge.
export const cacReminderTemplate = (name: string, storeName: string | null, settingsUrl: string) =>
  renderEmailLayout({
    preheader: "Add your CAC number to get a verified badge buyers trust.",
    eyebrow: "Seller tip",
    heading: "Add your CAC number",
    bodyHtml: `
      <p style="margin:0;">
        Hi ${name}, buyers on Nestly look for the <strong style="color:#13131A;">verified badge</strong>
        before they order from a seller they haven't bought from before.
      </p>
      <p style="margin:16px 0 0 0;">
        If your business is registered with the CAC, add your registration number in Seller Hub
        ${storeName ? `for <strong style="color:#13131A;">${storeName}</strong>` : ""}. It only takes a minute.
        We check it against the CAC public register and add the verified badge to your store, usually within a couple of days.
      </p>
      ${emailButton("Add your CAC number", settingsUrl)}
      ${emailNotice("Not registered yet? No problem - you can keep selling as usual and add it whenever you're ready.")}
    `,
  });
