import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

import prisma from "../prisma/prisma";
import { JwtPayload } from "../middleware/auth-middleware";

let io: Server;

// Every socket must present the same access token it'd send as a Bearer
// header on a normal request. Without this, any client could `emit("join",
// someoneElses UserId)` and silently receive their messages/notifications -
// the room name was the only thing standing in the way. Verifying here once,
// at handshake time, and deriving the room from the token is what actually
// closes that off.
const authenticateSocket = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error("Unauthorized"));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    socket.data.userId = decoded.id;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
};

export const initSocket = (
  server: HttpServer
) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;

    // Room = verified identity, not whatever the client claims - joining
    // happens right here instead of waiting on a client-sent "join" event.
    socket.join(userId);

    console.log(
      `User ${userId} connected:`,
      socket.id
    );

    // Ephemeral relay only - nothing here is persisted. Recipients are
    // resolved from the conversation's real participants (and the sender is
    // confirmed to be one of them) rather than trusting a client-supplied
    // target, so a socket can't spoof a typing indicator into a thread it's
    // not part of.
    socket.on(
      "typing",
      async ({ conversationId }: { conversationId: string }) => {
        try {
          const participants = await prisma.conversationParticipant.findMany({
            where: { conversationId },
            select: { userId: true },
          });

          const isParticipant = participants.some((p) => p.userId === userId);
          if (!isParticipant) return;

          for (const participant of participants) {
            if (participant.userId !== userId) {
              socket.to(participant.userId).emit("typing", { conversationId });
            }
          }
        } catch (error) {
          console.error("Typing relay failed:", error);
        }
      }
    );

    socket.on(
      "disconnect",
      () => {
        console.log(
          `User ${userId} disconnected:`,
          socket.id
        );
      }
    );
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket not initialized"
    );
  }

  return io;
};
