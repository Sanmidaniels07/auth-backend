import type { Namespace, Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

import prisma from "../prisma/prisma";
import { JwtPayload } from "../middleware/auth-middleware";
import { AppError } from "../utils/appError";
import { liveHostRoom, liveRoom, liveViewerCount, setLiveNamespace } from "./live-emitter";
import { recordViewerPeak, sendLiveChatService } from "../modules/live/live.service";

// The /live namespace: everyone on a live page (guests included) joins the
// live's room to get chat, hearts, pins, purchases and the viewer count.
// Unlike the main namespace, a login is optional here - guests can watch,
// only signed-in viewers can chat.

const CHAT_GAP_MS = 1500;
const HEART_GAP_MS = 250;
const VIEWER_UPDATE_DELAY_MS = 1500;

const optionalAuth = (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (token) {
    try {
      socket.data.userId = (jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload).id;
    } catch {
      // Expired / invalid token: carry on as a guest rather than refusing.
    }
  }
  next();
};

// Viewer counts are sent at most every 1.5s per live, however busy it gets.
const pendingCounts = new Map<string, NodeJS.Timeout>();
const scheduleViewerUpdate = (namespace: Namespace, liveId: string) => {
  if (pendingCounts.has(liveId)) return;
  pendingCounts.set(
    liveId,
    setTimeout(() => {
      pendingCounts.delete(liveId);
      const viewers = liveViewerCount(liveId);
      namespace.to(liveRoom(liveId)).emit("live:viewers", { viewers });
      recordViewerPeak(liveId, viewers).catch(() => {});
    }, VIEWER_UPDATE_DELAY_MS)
  );
};

type Ack = (response: { ok: boolean; error?: string; [key: string]: unknown }) => void;
const safeAck = (ack: unknown): Ack => (typeof ack === "function" ? (ack as Ack) : () => {});

export const initLiveNamespace = (io: Server) => {
  const namespace = io.of("/live");
  namespace.use(optionalAuth);
  setLiveNamespace(namespace);

  namespace.on("connection", (socket) => {
    const userId = socket.data.userId as string | undefined;
    const joined = new Set<string>();
    let lastChat = 0;
    let lastHeart = 0;

    socket.on("live:join", async (payload: { liveId?: string }, ack: unknown) => {
      const reply = safeAck(ack);
      const liveId = typeof payload?.liveId === "string" ? payload.liveId : "";
      try {
        const live = await prisma.liveSession.findUnique({
          where: { id: liveId },
          select: { id: true, store: { select: { isSuspended: true, seller: { select: { userId: true } } } } },
        });
        if (!live || live.store.isSuspended) return reply({ ok: false, error: "Live not found." });

        socket.join(liveRoom(liveId));
        if (userId && userId === live.store.seller.userId) socket.join(liveHostRoom(liveId));
        joined.add(liveId);
        scheduleViewerUpdate(namespace, liveId);
        reply({ ok: true, viewers: liveViewerCount(liveId) });
      } catch (error) {
        console.error("Live join failed:", error);
        reply({ ok: false, error: "Couldn't join the live." });
      }
    });

    socket.on("live:leave", (payload: { liveId?: string }) => {
      const liveId = payload?.liveId;
      if (!liveId || !joined.has(liveId)) return;
      socket.leave(liveRoom(liveId));
      socket.leave(liveHostRoom(liveId));
      joined.delete(liveId);
      scheduleViewerUpdate(namespace, liveId);
    });

    socket.on("live:chat", async (payload: { liveId?: string; text?: string }, ack: unknown) => {
      const reply = safeAck(ack);
      const liveId = payload?.liveId ?? "";
      if (!userId) return reply({ ok: false, error: "Log in to chat." });
      if (!joined.has(liveId)) return reply({ ok: false, error: "Join the live first." });
      if (typeof payload?.text !== "string") return reply({ ok: false, error: "Type a message first." });

      const now = Date.now();
      if (now - lastChat < CHAT_GAP_MS) return reply({ ok: false, error: "Slow down a little." });
      lastChat = now;

      try {
        const message = await sendLiveChatService(userId, liveId, payload.text);
        reply({ ok: true, message });
      } catch (error) {
        reply({ ok: false, error: error instanceof AppError ? error.message : "Couldn't send that." });
      }
    });

    // Hearts are fire-and-forget and never stored.
    socket.on("live:heart", (payload: { liveId?: string }) => {
      const liveId = payload?.liveId ?? "";
      const now = Date.now();
      if (!joined.has(liveId) || now - lastHeart < HEART_GAP_MS) return;
      lastHeart = now;
      socket.to(liveRoom(liveId)).emit("live:heart", {});
    });

    socket.on("disconnect", () => {
      joined.forEach((liveId) => scheduleViewerUpdate(namespace, liveId));
    });
  });
};
