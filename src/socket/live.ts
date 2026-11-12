import type { Namespace, Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

import prisma from "../prisma/prisma";
import { JwtPayload } from "../middleware/auth-middleware";
import { AppError } from "../utils/appError";
import { liveHostRoom, liveRoom, liveViewerCount, setLiveNamespace } from "./live-emitter";
import { recordViewerPeak, sendLiveChatService } from "../modules/live/live.service";
import { stageView } from "../modules/live/live-stage";

// The /live namespace: everyone on a live page (guests included) joins the
// live's room to get chat, hearts, pins, purchases and the viewer count.
// Unlike the main namespace, a login is optional here - guests can watch,
// only signed-in viewers can chat.

const CHAT_GAP_MS = 1500;
const HEART_GAP_MS = 250;
const VIEWER_UPDATE_DELAY_MS = 1500;
const CARD_GAP_MS = 40;

// Where the seller has put the product card on the screen, per live: x/y are
// 0-1 across the free space (so it lands in the same spot on any screen
// size), scale is the card's size. Kept in memory - after a restart the card
// goes back to its usual corner.
type CardLayout = { x: number; y: number; scale: number };
const cardLayouts = new Map<string, CardLayout>();
const clamp = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : null;

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
    // Lives this socket is the seller of.
    const hosting = new Set<string>();
    let lastCard = 0;
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
        if (userId && userId === live.store.seller.userId) {
          socket.join(liveHostRoom(liveId));
          hosting.add(liveId);
        }
        joined.add(liveId);
        scheduleViewerUpdate(namespace, liveId);
        reply({ ok: true, viewers: liveViewerCount(liveId), card: cardLayouts.get(liveId) ?? null, stage: stageView(liveId) });
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
      hosting.delete(liveId);
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

    // The seller moved or resized the product card: everyone else follows.
    socket.on("live:card", (payload: { liveId?: string; x?: unknown; y?: unknown; scale?: unknown }) => {
      const liveId = payload?.liveId ?? "";
      if (!hosting.has(liveId)) return;
      const now = Date.now();
      if (now - lastCard < CARD_GAP_MS) return;
      lastCard = now;
      const x = clamp(payload.x, 0, 1);
      const y = clamp(payload.y, 0, 1);
      const scale = clamp(payload.scale, 0.6, 1.8);
      if (x === null || y === null || scale === null) return;
      const layout = { x, y, scale };
      cardLayouts.set(liveId, layout);
      socket.to(liveRoom(liveId)).emit("live:card", layout);
    });

    socket.on("disconnect", () => {
      joined.forEach((liveId) => scheduleViewerUpdate(namespace, liveId));
    });
  });
};
