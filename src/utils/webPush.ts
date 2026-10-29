import webpush from "web-push";

import prisma from "../prisma/prisma";

// Web Push: notifications on a phone or computer, even when Nestly isn't open.
// Needs VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (one pair per environment) -
// without them pushes are skipped and everything else works as before.

let configured: boolean | null = null;

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

const isConfigured = () => {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  configured = !!publicKey && !!privateKey;
  if (configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:support@nestlyapp.site", publicKey!, privateKey!);
  } else {
    console.warn("Web push is off: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set.");
  }
  return configured;
};

// Only real browser push services - the server POSTs to this address, so
// it must never be somewhere arbitrary.
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
  "push.apple.com",
  "notify.windows.com",
];

export const isAllowedPushEndpoint = (endpoint: string) => {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && PUSH_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
};

export interface PushPayload {
  title: string;
  body: string;
  /** Page to open when it's tapped (same site). */
  url: string;
  /** Pushes with the same tag replace each other (e.g. one per chat). */
  tag?: string;
  /** Messages and orders should arrive straight away, even on battery saver. */
  urgent?: boolean;
}

/** Sends to every device the user allowed. Never throws. */
export const sendPushToUser = async (userId: string, payload: PushPayload) => {
  if (!isConfigured()) return 0;

  const subscriptions = await prisma.webPushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url, tag: payload.tag });
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          body,
          { TTL: 24 * 60 * 60, urgency: payload.urgent ? "high" : "normal" }
        );
        sent += 1;
        await prisma.webPushSubscription.update({ where: { id: subscription.id }, data: { lastPushedAt: new Date() } });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // The browser unsubscribed or the subscription expired - forget it.
        if (status === 404 || status === 410) {
          await prisma.webPushSubscription.deleteMany({ where: { id: subscription.id } });
        } else {
          console.error(`Push to ${userId} failed:`, status ?? error);
        }
      }
    })
  );

  return sent;
};
