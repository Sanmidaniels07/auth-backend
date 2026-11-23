import { emailButton, renderEmailLayout } from "./base.template";

// "We miss you" catch-up for people who haven't opened Nestly in a while
// (modules/winback). Shows what actually happened while they were away -
// numbers for sellers, messages, and products picked for them. Part of the
// "We miss you" switch in Settings -> Notifications.

const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface WinbackFact {
  count: number;
  label: string;
  url: string;
}

export interface WinbackPick {
  title: string;
  price: number;
  storeName: string;
  imageUrl?: string | null;
  url: string;
}

export const winbackEmail = (opts: {
  name: string;
  heading: string;
  intro: string;
  facts: WinbackFact[];
  picks: WinbackPick[];
  picksTitle: string;
  buttonLabel: string;
  buttonUrl: string;
  settingsUrl: string;
}) =>
  renderEmailLayout({
    preheader: opts.facts[0] ? `${opts.facts[0].count} ${opts.facts[0].label}` : opts.intro,
    eyebrow: "While you were away",
    heading: opts.heading,
    bodyHtml: `
      <p style="margin:0;">Hi ${escapeHtml(opts.name)}, ${escapeHtml(opts.intro)}</p>
      ${
        opts.facts.length
          ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0 4px 0;">
        ${opts.facts
          .map(
            (fact) => `
        <tr>
          <td style="padding:12px 14px; border:1px solid #ECE9F6; border-radius:12px; background-color:#FAFAFD;">
            <a href="${fact.url}" style="text-decoration:none; display:block;">
              <span style="font-size:22px; font-weight:700; color:#6D28D9;">${fact.count.toLocaleString("en-NG")}</span>
              <span style="font-size:14.5px; color:#13131A;">&nbsp;${escapeHtml(fact.label)} &rarr;</span>
            </a>
          </td>
        </tr>
        <tr><td style="height:8px; line-height:8px;">&nbsp;</td></tr>`
          )
          .join("")}
      </table>`
          : ""
      }
      ${
        opts.picks.length
          ? `<p style="margin:18px 0 0 0; font-size:14px; font-weight:600; color:#13131A;">${escapeHtml(opts.picksTitle)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px; border-collapse:collapse;">
        ${opts.picks
          .map(
            (pick) => `
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #EEF0F4; width:64px;">
              <a href="${pick.url}">${pick.imageUrl ? `<img src="${escapeHtml(pick.imageUrl)}" width="56" height="56" alt="" style="display:block; border-radius:10px; object-fit:cover;" />` : ""}</a>
            </td>
            <td style="padding:10px 12px; border-bottom:1px solid #EEF0F4;">
              <a href="${pick.url}" style="font-size:14px; color:#13131A; text-decoration:none; font-weight:600;">${escapeHtml(pick.title)}</a>
              <div style="font-size:12.5px; color:#64748B; margin-top:2px;">${escapeHtml(pick.storeName)}</div>
            </td>
            <td align="right" style="padding:10px 0; border-bottom:1px solid #EEF0F4; font-size:14px; color:#13131A; white-space:nowrap;">${naira(pick.price)}</td>
          </tr>`
          )
          .join("")}
      </table>`
          : ""
      }
      ${emailButton(opts.buttonLabel, opts.buttonUrl)}
      <p style="margin:22px 0 0 0; font-size:12px; line-height:1.6; color:#94A3B8;">
        You're getting this because "We miss you" updates are on.
        <a href="${opts.settingsUrl}" style="color:#6D28D9;">Turn them off</a> any time.
      </p>
    `,
  });
