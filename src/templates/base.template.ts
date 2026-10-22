// Shared building blocks for every transactional email, kept table-based and
// inline-styled (no <style> blocks / flexbox / grid) because Outlook and a
// handful of mobile mail clients strip or ignore anything else. Mirrors the
// app's actual look - the violet -> indigo gradient mark, the italic serif
// wordmark, the mono uppercase eyebrow labels, the rounded #ECE9F6-bordered
// cards - just rebuilt with fonts/markup an inbox will actually render.

import { envList, normalizeOrigin } from "../config/environment";

// Images in email must be hosted PNGs (Gmail/Outlook don't render SVG or
// data: URIs reliably). The mark lives in the frontend's public folder, so
// each environment's emails load it from that environment's site.
const frontendOrigin = () =>
  normalizeOrigin(envList(process.env.FRONTEND_URL)[0] ?? "") || "https://www.nestlyapp.site";
const logoUrl = () => `${frontendOrigin()}/email/nestly-mark.png`;

// Nestly Support is on WhatsApp for now (same number as the app's support
// buttons); override with SUPPORT_WHATSAPP, digits only.
const supportWhatsAppUrl = () => `https://wa.me/${process.env.SUPPORT_WHATSAPP || "2348159671809"}`;

const BRAND = {
  name: "Nestly",
  gradientFrom: "#7C3AED",
  gradientTo: "#4F46E5",
  ink: "#13131A",
  subtleInk: "#334155",
  mutedInk: "#94A3B8",
  border: "#ECE9F6",
  surface: "#FAFAFD",
  pageBg: "#F5F5FA",
  amber: "#B45309",
  amberBg: "#FFFBEB",
  amberBorder: "#FDE68A",
} as const;

// Web fonts aren't reliable in inboxes, so these approximate the app's
// Fraunces (serif display, used italic) and JetBrains Mono (uppercase
// eyebrow labels) with system stacks that render everywhere.
const SERIF_STACK = `Georgia, 'Times New Roman', Times, serif`;
const MONO_STACK = `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace`;
const SANS_STACK = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

export const emailButton = (label: string, href: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px 0;">
    <tr>
      <td align="center" bgcolor="${BRAND.gradientFrom}" style="border-radius:999px; background-color:${BRAND.gradientFrom}; background-image:linear-gradient(135deg, ${BRAND.gradientFrom}, ${BRAND.gradientTo});">
        <a href="${href}" target="_blank" style="display:inline-block; padding:14px 32px; font-family:${SANS_STACK}; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:999px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

export const emailNotice = (
  text: string,
  tone: "warning" | "info" = "info"
) => {
  const isWarning = tone === "warning";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:18px; border-radius:14px; background-color:${
      isWarning ? BRAND.amberBg : BRAND.surface
    }; border:1px solid ${isWarning ? BRAND.amberBorder : BRAND.border};">
      <tr>
        <td style="padding:14px 16px; font-family:${SANS_STACK}; font-size:13px; line-height:1.6; color:${
          isWarning ? BRAND.amber : "#64748B"
        };">
          ${text}
        </td>
      </tr>
    </table>
  `;
};

export const emailFinePrintLink = (url: string) => `
  <p style="margin:18px 0 0 0; font-family:${SANS_STACK}; font-size:12.5px; line-height:1.6; color:${BRAND.mutedInk}; word-break:break-all;">
    Or paste this link into your browser:<br />
    <a href="${url}" style="color:${BRAND.gradientFrom};">${url}</a>
  </p>
`;

interface EmailLayoutOptions {
  /** Preview text shown next to the subject line in most inboxes. */
  preheader?: string;
  /** Small uppercase mono label above the heading, e.g. "Security alert". */
  eyebrow?: string;
  heading: string;
  /** Pre-built inner HTML - paragraphs, emailButton(), emailNotice(), etc. */
  bodyHtml: string;
}

export const renderEmailLayout = ({
  preheader,
  eyebrow,
  heading,
  bodyHtml,
}: EmailLayoutOptions) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${heading}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BRAND.pageBg}; font-family:${SANS_STACK};">
    ${
      preheader
        ? `<div style="display:none; max-height:0; max-width:0; overflow:hidden; opacity:0; mso-hide:all;">${preheader}</div>`
        : ""
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.pageBg};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:480px; background-color:#ffffff; border-radius:24px; border:1px solid ${BRAND.border};">
            <tr>
              <td style="padding:32px 36px 0 36px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="40" height="40" valign="middle" style="width:40px; height:40px;">
                      <img src="${logoUrl()}" width="40" height="40" alt="" style="display:block; width:40px; height:40px; border:0; outline:none; text-decoration:none;" />
                    </td>
                    <td valign="middle" style="padding-left:10px; font-family:${SERIF_STACK}; font-style:italic; font-size:22px; color:${BRAND.ink};">
                      ${BRAND.name}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 36px 4px 36px;">
                ${
                  eyebrow
                    ? `<p style="margin:0 0 8px 0; font-family:${MONO_STACK}; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:${BRAND.gradientFrom};">${eyebrow}</p>`
                    : ""
                }
                <h1 style="margin:0; font-family:${SERIF_STACK}; font-style:italic; font-weight:normal; font-size:24px; line-height:1.3; color:${BRAND.ink};">${heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 36px 36px 36px; font-family:${SANS_STACK}; font-size:14.5px; line-height:1.65; color:${BRAND.subtleInk};">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px 28px 36px; border-top:1px solid ${BRAND.border};">
                <p style="margin:0; font-family:${SANS_STACK}; font-size:12px; line-height:1.6; color:${BRAND.mutedInk};">
                  Sent by ${BRAND.name}. This is an automated message, so replies to this email aren't read.
                  Need help? <a href="${supportWhatsAppUrl()}" target="_blank" style="color:${BRAND.gradientFrom}; text-decoration:none; font-weight:600;">Chat with Nestly Support on WhatsApp</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
