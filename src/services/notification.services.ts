import prisma from "../prisma/prisma";
import { getIO } from "../socket";


export const
  createNotificationService =
  async (
    userId: string,
    title: string,
    message: string
  ) => {
    const notification =
      await prisma.notification.create({
        data: {
          userId,
          title,
          message,
        },
      });

    const io = getIO();

    io.to(userId).emit(
      "notification",
      notification
    );

    return notification;
  };

  export const getNotificationsService =
  async (userId: string) => {
    return prisma.notification.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };

  export const markNotificationReadService =
  async (
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