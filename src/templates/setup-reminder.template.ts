import { renderEmailLayout, emailButton, emailNotice } from "./base.template";

// "Finish setting up" nudge listing exactly what's left before the seller
// can take orders and get paid.
export const setupReminderTemplate = (
  name: string,
  steps: { title: string; why: string; url: string }[],
  sellerHubUrl: string
) =>
  renderEmailLayout({
    preheader: `${steps.length} thing${steps.length === 1 ? "" : "s"} left before buyers can order from you.`,
    eyebrow: "Seller Hub",
    heading: "Finish setting up your store",
    bodyHtml: `
      <p style="margin:0;">
        Hi ${name}, you're approved to sell on Nestly, but buyers can't order from you yet.
        ${steps.length === 1 ? "There's one thing left:" : `There are ${steps.length} things left:`}
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;">
        ${steps
          .map(
            (step) => `
        <tr>
          <td style="padding:12px 14px; border:1px solid #ECE9F6; border-radius:12px; background-color:#FAFAFD;">
            <a href="${step.url}" style="font-size:15px; font-weight:600; color:#6D28D9; text-decoration:none;">${step.title} &rarr;</a>
            <div style="margin-top:4px; font-size:13px; line-height:1.5; color:#64748B;">${step.why}</div>
          </td>
        </tr>
        <tr><td style="height:8px; line-height:8px;">&nbsp;</td></tr>`
          )
          .join("")}
      </table>
      ${emailButton("Open Seller Hub", sellerHubUrl)}
      ${emailNotice("Each step takes a few minutes. We'll stop reminding you once your store is ready.")}
    `,
  });
