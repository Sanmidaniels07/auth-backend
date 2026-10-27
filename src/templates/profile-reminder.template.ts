import { renderEmailLayout, emailButton, emailNotice } from "./base.template";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// "Finish your profile" nudge for new members, listing what's left.
export const profileReminderTemplate = (
  name: string,
  steps: { title: string; why: string; url: string }[],
  dashboardUrl: string
) =>
  renderEmailLayout({
    preheader: `${steps.length} quick thing${steps.length === 1 ? "" : "s"} left on your Nestly profile.`,
    eyebrow: "Welcome to Nestly",
    heading: "Finish setting up your profile",
    bodyHtml: `
      <p style="margin:0;">
        Hi ${escapeHtml(name)}, welcome to the nest! A complete profile helps people find you and makes checkout quicker.
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
      ${emailButton("Open Nestly", dashboardUrl)}
      ${emailNotice("Each step takes less than a minute. We'll only remind you once more.")}
    `,
  });
