import { Server } from "socket.io";

import prisma from "../prisma/prisma";

// Who has Nestly open right now (one count per open tab/device), so chats
// can show "Online" or "Active 5m ago" (User.lastSeenAt). In memory - one
// server instance - and only shared with people the user has a chat with.

const openSockets = new Map<string, number>();

export const isOnline = (userId: string) => (openSockets.get(userId) ?? 0) > 0;

const chatPartners = async (userId: string) => {
  const rows = await prisma.conversationParticipant.findMany({
    where: { conversation: { participants: { some: { userId } } }, userId: { not: userId } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.map((row) => row.userId);
};

const announce = async (io: Server, userId: string, online: boolean, lastSeenAt: Date | null) => {
  for (const partnerId of await chatPartners(userId)) {
    io.to(partnerId).emit("presence", { userId, online, lastSeenAt });
  }
};

export const userConnected = async (io: Server, userId: string) => {
  const count = (openSockets.get(userId) ?? 0) + 1;
  openSockets.set(userId, count);
  if (count === 1) await announce(io, userId, true, null).catch((error) => console.error("Presence announce failed:", error));
};

export const userDisconnected = async (io: Server, userId: string) => {
  const count = Math.max(0, (openSockets.get(userId) ?? 1) - 1);
  if (count > 0) {
    openSockets.set(userId, count);
    return;
  }
  openSockets.delete(userId);
  const lastSeenAt = new Date();
  try {
    await prisma.user.update({ where: { id: userId }, data: { lastSeenAt } });
    await announce(io, userId, false, lastSeenAt);
  } catch (error) {
    console.error("Presence update failed:", error);
  }
};
