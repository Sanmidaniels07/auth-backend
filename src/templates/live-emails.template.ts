import { emailButton, renderEmailLayout } from "./base.template";

// Live selling emails, sent only to people who tapped "Remind me" on a live
// (NotificationType.LIVE - turned off in Settings -> Notifications).

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface LiveEmailOptions {
  name: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  intro: string;
  liveTitle: string;
  storeName: string;
  when: string;
  coverImage?: string | null;
  buttonLabel: string;
  url: string;
  settingsUrl: string;
}

export const liveReminderEmail = (opts: LiveEmailOptions) =>
  renderEmailLayout({
    preheader: opts.preheader,
    eyebrow: opts.eyebrow,
    heading: opts.heading,
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, ${escapeHtml(opts.intro)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px; border:1px solid #ECE9F6; border-radius:16px; border-collapse:separate; overflow:hidden;">
        ${
          opts.coverImage
            ? `<tr><td><img src="${escapeHtml(opts.coverImage)}" width="100%" alt="" style="display:block; width:100%; max-height:260px; object-fit:cover;" /></td></tr>`
            : ""
        }
        <tr>
          <td style="padding:16px 18px;">
            <p style="margin:0; font-size:16px; font-weight:600; color:#13131A;">${escapeHtml(opts.liveTitle)}</p>
            <p style="margin:6px 0 0 0; font-size:13px; color:#64748B;">${escapeHtml(opts.storeName)} &middot; ${escapeHtml(opts.when)}</p>
          </td>
        </tr>
      </table>
      ${emailButton(opts.buttonLabel, opts.url)}
      <p style="margin:22px 0 0 0; font-size:12px; line-height:1.6; color:#94A3B8;">
        You're getting this because you asked to be reminded about this live.
        <a href="${opts.settingsUrl}" style="color:#6D28D9;">Turn off live updates</a> any time.
      </p>
    `,
  });
