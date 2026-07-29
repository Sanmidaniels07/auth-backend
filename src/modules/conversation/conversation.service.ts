import { NotificationType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { getIO } from "../../socket";
import { createNotificationService } from "../notification/notification.service";
import { isBlockedEitherWay } from "../block/block.service";

const PARTICIPANT_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
};

const assertParticipant = async (
  userId: string,
  conversationId: string
) => {
  const participant =
    await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

  if (!participant) {
    throw new AppError("Conversation not found.", 404);
  }
};

export const getOrCreateConversationService = async (
  userId: string,
  otherUserId: string
) => {
  if (userId === otherUserId) {
    throw new AppError("You cannot message yourself.", 400);
  }

  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
  });

  if (!otherUser) {
    throw new AppError("User not found.", 404);
  }

  if (await isBlockedEitherWay(userId, otherUserId)) {
    throw new AppError(
      "You cannot message this user.",
      403
    );
  }

  const myConversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: { participants: true },
  });

  const existing = myConversations.find((conversation) => {
    const ids = conversation.participants.map(
      (p) => p.userId
    );
    return ids.length === 2 && ids.includes(otherUserId);
  });

  if (existing) {
    return existing;
  }

  return prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId }, { userId: otherUserId }],
      },
    },
    include: { participants: true },
  });
};

export const getConversationsService = async (
  userId: string,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  const where = { participants: { some: { userId } } };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        participants: {
          include: {
            user: { select: PARTICIPANT_USER_SELECT },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  const conversationsWithMeta = await Promise.all(
    conversations.map(async (conversation) => {
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== userId
      )?.user;

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          readAt: null,
        },
      });

      return {
        id: conversation.id,
        otherParticipant,
        lastMessage: conversation.messages[0] ?? null,
        unreadCount,
        updatedAt: conversation.updatedAt,
      };
    })
  );

  return {
    conversations: conversationsWithMeta,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getMessagesService = async (
  userId: string,
  conversationId: string,
  page: number,
  limit: number
) => {
  await assertParticipant(userId, conversationId);

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: PARTICIPANT_USER_SELECT },
      },
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);

  return {
    messages,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const sendMessageService = async (
  userId: string,
  conversationId: string,
  content: string
) => {
  await assertParticipant(userId, conversationId);

  const otherParticipants =
    await prisma.conversationParticipant.findMany({
      where: { conversationId, NOT: { userId } },
    });

  for (const participant of otherParticipants) {
    if (await isBlockedEitherWay(userId, participant.userId)) {
      throw new AppError(
        "You cannot message this user.",
        403
      );
    }
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: userId, content },
      include: {
        sender: { select: PARTICIPANT_USER_SELECT },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  try {
    const io = getIO();
    for (const participant of otherParticipants) {
      io.to(participant.userId).emit("message:new", message);
    }
  } catch (error) {
    console.error(
      "Realtime message delivery failed:",
      error
    );
  }

  for (const participant of otherParticipants) {
    createNotificationService(
      participant.userId,
      "New Message",
      `${message.sender.name} sent you a message`,
      NotificationType.MESSAGE
    ).catch((error) => {
      console.error("Notification failed:", error);
    });
  }

  return message;
};

export const markConversationReadService = async (
  userId: string,
  conversationId: string
) => {
  await assertParticipant(userId, conversationId);

  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
};
