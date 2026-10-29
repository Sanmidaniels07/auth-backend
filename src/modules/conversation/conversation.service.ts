import { MediaType, NotificationType, ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { getIO } from "../../socket";
import { createNotificationService } from "../notification/notification.service";
import { isBlockedEitherWay } from "../block/block.service";
import { hideContacts } from "../../utils/contactFilter";
import { isOnline } from "../../socket/presence";

interface MediaInput {
  url: string;
  type: MediaType;
}

const PARTICIPANT_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
};

const PRODUCT_CARD_SELECT = {
  id: true,
  title: true,
  price: true,
  status: true,
  images: { where: { isPrimary: true }, take: 1, select: { url: true } },
  store: { select: { name: true, slug: true } },
} as const;

const MESSAGE_INCLUDE = {
  sender: { select: PARTICIPANT_USER_SELECT },
  media: {
    orderBy: { order: "asc" as const },
  },
  // What a reply is quoting - enough to show "Replying to Ada: ...".
  replyTo: {
    select: {
      id: true,
      content: true,
      senderId: true,
      deletedAt: true,
      sender: { select: { name: true } },
      media: { orderBy: { order: "asc" as const }, take: 1, select: { url: true, type: true } },
      product: { select: { title: true } },
    },
  },
  product: { select: PRODUCT_CARD_SELECT },
  reactions: { select: { emoji: true, userId: true } },
};

// The person on the other side of a chat, with what the header and list
// show: when they were last active and their store (if they sell).
const CHAT_PARTNER_SELECT = {
  ...PARTICIPANT_USER_SELECT,
  lastSeenAt: true,
  sellerProfile: { select: { store: { select: { name: true, slug: true } } } },
} as const;

const toChatPartner = (user: {
  id: string;
  lastSeenAt: Date | null;
  sellerProfile: { store: { name: string; slug: string } | null } | null;
} & Record<string, unknown>) => {
  const { sellerProfile, ...rest } = user;
  return { ...rest, online: isOnline(user.id), store: sellerProfile?.store ?? null };
};

// Tell everyone in the chat (including the actor's other tabs) that a
// message changed - a reaction, or it was unsent.
const broadcastUpdate = async (conversationId: string, message: unknown) => {
  try {
    const participants = await prisma.conversationParticipant.findMany({ where: { conversationId }, select: { userId: true } });
    const io = getIO();
    for (const participant of participants) io.to(participant.userId).emit("message:updated", message);
  } catch (error) {
    console.error("Realtime message update failed:", error);
  }
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
            user: { select: CHAT_PARTNER_SELECT },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            media: { orderBy: { order: "asc" as const } },
            product: { select: { title: true } },
          },
        },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  const conversationsWithMeta = await Promise.all(
    conversations.map(async (conversation) => {
      const partner = conversation.participants.find(
        (p) => p.userId !== userId
      )?.user;
      const otherParticipant = partner ? toChatPartner(partner) : undefined;

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
      include: MESSAGE_INCLUDE,
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
  content: string | undefined,
  media?: MediaInput[],
  replyToId?: string,
  productId?: string
) => {
  await assertParticipant(userId, conversationId);

  if (replyToId) {
    const original = await prisma.message.findFirst({ where: { id: replyToId, conversationId }, select: { id: true } });
    if (!original) throw new AppError("The message you're replying to isn't in this chat.", 400);
  }

  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, status: { in: [ProductStatus.PUBLISHED, ProductStatus.OUT_OF_STOCK] }, store: { isSuspended: false } },
      select: { id: true },
    });
    if (!product) throw new AppError("That product isn't available.", 404);
  }

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

  // Chats with a seller stay on Nestly: phone numbers, emails, handles and
  // social links are hidden before the message is saved (utils/contactFilter).
  const involvesSeller =
    !!content &&
    (await prisma.store.count({
      where: { seller: { userId: { in: [userId, ...otherParticipants.map((p) => p.userId)] } } },
    })) > 0;
  const filtered = involvesSeller && content ? hideContacts(content) : null;
  if (filtered) content = filtered.text;

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        replyToId: replyToId ?? null,
        productId: productId ?? null,
        media: media
          ? {
              create: media.map((item, index) => ({
                url: item.url,
                type: item.type,
                order: index,
              })),
            }
          : undefined,
      },
      include: MESSAGE_INCLUDE,
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

  const notificationBody = message.content
    ? `${message.sender.name} sent you a message`
    : message.product
      ? `${message.sender.name} shared a product with you`
      : `${message.sender.name} sent you ${
          message.media[0]?.type === MediaType.VIDEO ? "a video" : "a photo"
        }`;

  for (const participant of otherParticipants) {
    createNotificationService(
      participant.userId,
      "New Message",
      notificationBody,
      NotificationType.MESSAGE,
      { type: "CONVERSATION", id: conversationId }
    ).catch((error) => {
      console.error("Notification failed:", error);
    });
  }

  return { ...message, contactHidden: !!filtered?.hidden };
};

export const markConversationReadService = async (
  userId: string,
  conversationId: string
) => {
  await assertParticipant(userId, conversationId);

  const { count } = await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  // Their "New Message" alerts for this chat are read too - keeps the bell
  // and the number on the app icon honest.
  await prisma.notification.updateMany({
    where: { userId, type: "MESSAGE", targetType: "CONVERSATION", targetId: conversationId, isRead: false },
    data: { isRead: true },
  });

  // Let whoever sent those messages know they've been seen, live - without
  // this their thread only picks up the read state on its next refetch.
  if (count > 0) {
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId, NOT: { userId } },
    });

    try {
      const io = getIO();
      for (const participant of otherParticipants) {
        io.to(participant.userId).emit("message:read", {
          conversationId,
          readerId: userId,
        });
      }
    } catch (error) {
      console.error("Realtime read receipt failed:", error);
    }
  }
};

const findMessageInChat = async (conversationId: string, messageId: string) => {
  const message = await prisma.message.findFirst({ where: { id: messageId, conversationId } });
  if (!message) throw new AppError("Message not found.", 404);
  return message;
};

/** React with an emoji (replaces your earlier reaction); null removes it. */
export const reactToMessageService = async (
  userId: string,
  conversationId: string,
  messageId: string,
  emoji: string | null
) => {
  await assertParticipant(userId, conversationId);
  const message = await findMessageInChat(conversationId, messageId);
  if (message.deletedAt) throw new AppError("This message was deleted.", 400);

  if (emoji) {
    await prisma.messageReaction.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, emoji },
      update: { emoji },
    });
  } else {
    await prisma.messageReaction.deleteMany({ where: { messageId, userId } });
  }

  const updated = await prisma.message.findUniqueOrThrow({ where: { id: messageId }, include: MESSAGE_INCLUDE });
  await broadcastUpdate(conversationId, updated);
  return updated;
};

/**
 * Unsend your own message for everyone: it becomes "This message was
 * deleted" - text, photos, product card and reactions are removed.
 */
export const deleteMessageService = async (userId: string, conversationId: string, messageId: string) => {
  await assertParticipant(userId, conversationId);
  const message = await findMessageInChat(conversationId, messageId);
  if (message.senderId !== userId) throw new AppError("You can only delete your own messages.", 403);
  if (message.deletedAt) return prisma.message.findUniqueOrThrow({ where: { id: messageId }, include: MESSAGE_INCLUDE });

  const [, , updated] = await prisma.$transaction([
    prisma.messageMedia.deleteMany({ where: { messageId } }),
    prisma.messageReaction.deleteMany({ where: { messageId } }),
    prisma.message.update({
      where: { id: messageId },
      data: { content: null, productId: null, deletedAt: new Date() },
      include: MESSAGE_INCLUDE,
    }),
  ]);

  await broadcastUpdate(conversationId, updated);
  return updated;
};
