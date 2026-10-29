import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { isValidPushReadToken, sendPushToUser, vapidPublicKey } from "../../utils/webPush";
import { markConversationReadService } from "../conversation/conversation.service";
import { SubscribeInput } from "./push.validation";

/** The key browsers need to subscribe; null when push isn't set up here. */
export const getPushConfigService = () => ({ publicKey: vapidPublicKey() });

/**
 * Saves this device for the signed-in user. A device that was signed in as
 * someone else moves to this user - one person's alerts never go to the
 * next person who signs in on that phone.
 */
export const subscribeService = async (userId: string, data: SubscribeInput, userAgent?: string) => {
  await prisma.webPushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: { userId, endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth, userAgent },
    update: { userId, p256dh: data.keys.p256dh, auth: data.keys.auth, userAgent },
  });
  return { subscribed: true };
};

export const unsubscribeService = async (userId: string, endpoint: string) => {
  await prisma.webPushSubscription.deleteMany({ where: { userId, endpoint } });
  return { subscribed: false };
};

/**
 * "Mark as read" on an alert. For a message it marks the whole chat read
 * (as opening it would). Returns what's still unread, for the app icon.
 */
export const readFromPushService = async (id: string, token: string) => {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || !isValidPushReadToken(id, notification.userId, token)) {
    throw new AppError("This notification can't be marked read.", 403);
  }

  const { userId } = notification;
  await prisma.notification.update({ where: { id }, data: { isRead: true } });

  if (notification.type === "MESSAGE" && notification.targetType === "CONVERSATION" && notification.targetId) {
    // They may have left the chat since - the alert is read either way.
    await markConversationReadService(userId, notification.targetId).catch(() => undefined);
  }

  const unread = await prisma.notification.count({ where: { userId, isRead: false } });
  return { unread };
};

/** "Send a test notification" on the settings page. */
export const sendTestPushService = async (userId: string) => {
  if (!vapidPublicKey()) throw new AppError("Push notifications aren't set up on this server yet.", 503);

  const devices = await prisma.webPushSubscription.count({ where: { userId } });
  if (devices === 0) throw new AppError("Turn on notifications on this device first.", 400);

  const sent = await sendPushToUser(userId, {
    title: "Notifications are on 🎉",
    body: "This is how Nestly will tell you about messages, orders and more.",
    url: "/settings/notifications",
    tag: "test",
    urgent: true,
  });
  return { devices, sent };
};
