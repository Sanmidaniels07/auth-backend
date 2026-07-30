import { NotificationType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { getIO } from "../../socket";

export const createNotificationService = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = NotificationType.SYSTEM,
  target?: { type: string; id: string }
) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: {
      userId_type: { userId, type },
    },
  });

  // No explicit preference row means the type defaults to enabled.
  if (preference && !preference.enabled) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      targetType: target?.type,
      targetId: target?.id,
    },
  });

  try {
    const io = getIO();
    io.to(userId).emit("notification", notification);
  } catch (error) {
    console.error("Realtime notification delivery failed:", error);
  }

  return notification;
};

export const getNotificationsService = async (
  userId: string
) => {
  return prisma.notification.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

export const markNotificationReadService = async (
  notificationId: string,
  userId: string
) => {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },

    data: {
      isRead: true,
    },
  });
};

export const markAllNotificationsReadService = async (
  userId: string
) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

const ALL_NOTIFICATION_TYPES = Object.values(NotificationType);

export const getNotificationPreferencesService = async (
  userId: string
) => {
  const preferences = await prisma.notificationPreference.findMany({
    where: { userId },
  });

  const preferenceMap = new Map(
    preferences.map((p) => [p.type, p.enabled])
  );

  return ALL_NOTIFICATION_TYPES.map((type) => ({
    type,
    enabled: preferenceMap.get(type) ?? true,
  }));
};

export const updateNotificationPreferenceService = async (
  userId: string,
  type: NotificationType,
  enabled: boolean
) => {
  return prisma.notificationPreference.upsert({
    where: {
      userId_type: { userId, type },
    },
    create: { userId, type, enabled },
    update: { enabled },
  });
};

export const registerPushTokenService = async (
  userId: string,
  token: string,
  platform?: string
) => {
  return prisma.pushToken.upsert({
    where: { token },
    create: { userId, token, platform },
    update: { userId, platform },
  });
};

export const unregisterPushTokenService = async (
  userId: string,
  token: string
) => {
  await prisma.pushToken.deleteMany({
    where: { userId, token },
  });
};