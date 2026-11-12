import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { MediaSource, listRoomPeople, muteSource, setAllowedSources } from "../../utils/livekit";
import { emitToLive } from "../../socket/live-emitter";
import { LiveStatus } from "@prisma/client";

// Buyers on a live can unmute and turn on their camera, like a meeting. The
// seller can mute anyone, stop someone turning their mic / camera back on,
// or switch it off for every buyer. Kept in memory per live (one API server);
// after a restart everyone is allowed again until the seller changes it.

interface Stage {
  // Off for every buyer.
  micsOff: boolean;
  camsOff: boolean;
  // userId -> what the seller has switched off for just them.
  blocked: Map<string, Set<MediaSource>>;
}

const stages = new Map<string, Stage>();
const stageOf = (liveId: string) => {
  let stage = stages.get(liveId);
  if (!stage) {
    stage = { micsOff: false, camsOff: false, blocked: new Map() };
    stages.set(liveId, stage);
  }
  return stage;
};

/** What this buyer may turn on right now. */
export const allowedSources = (liveId: string, userId: string): MediaSource[] => {
  const stage = stageOf(liveId);
  const blocked = stage.blocked.get(userId) ?? new Set<MediaSource>();
  const sources: MediaSource[] = [];
  if (!stage.micsOff && !blocked.has("microphone")) sources.push("microphone");
  if (!stage.camsOff && !blocked.has("camera")) sources.push("camera");
  return sources;
};

export const stageView = (liveId: string) => {
  const stage = stageOf(liveId);
  return {
    micsOff: stage.micsOff,
    camsOff: stage.camsOff,
    blocked: Object.fromEntries([...stage.blocked].map(([userId, set]) => [userId, [...set]])),
  };
};

export const clearStage = (liveId: string) => stages.delete(liveId);

/** Blocked from the live's chat: their mic and camera go off too, for good. */
export const silenceBuyer = async (liveId: string, userId: string) => {
  const stage = stageOf(liveId);
  stage.blocked.set(userId, new Set<MediaSource>(["microphone", "camera"]));
  const identity = `user_${userId}`;
  await Promise.all([muteSource(liveId, identity, "microphone"), muteSource(liveId, identity, "camera")]).catch(() => {});
  await setAllowedSources(liveId, identity, []);
  announce(liveId);
};

const buyerId = (identity: string) => (identity.startsWith("user_") ? identity.slice(5) : null);

const assertHost = async (userId: string, liveId: string) => {
  const live = await prisma.liveSession.findUnique({
    where: { id: liveId },
    select: { status: true, store: { select: { seller: { select: { userId: true } } } } },
  });
  if (!live || live.store.seller.userId !== userId) throw new AppError("Live not found.", 404);
  if (live.status !== LiveStatus.LIVE) throw new AppError("This live isn't on right now.", 400);
};

const announce = (liveId: string) => emitToLive(liveId, "live:stage", stageView(liveId));

/**
 * One buyer's mic or camera:
 *  - "off": turn it off now (they can turn it back on)
 *  - "block": turn it off and don't let them turn it back on
 *  - "allow": let them turn it on again
 */
export const setBuyerMediaService = async (userId: string, liveId: string, buyerUserId: string, source: MediaSource, action: "off" | "block" | "allow") => {
  await assertHost(userId, liveId);
  const identity = `user_${buyerUserId}`;
  const stage = stageOf(liveId);
  if (action !== "allow") await muteSource(liveId, identity, source);
  if (action === "block") {
    const set = stage.blocked.get(buyerUserId) ?? new Set<MediaSource>();
    set.add(source);
    stage.blocked.set(buyerUserId, set);
  }
  if (action === "allow") {
    stage.blocked.get(buyerUserId)?.delete(source);
    if (stage.blocked.get(buyerUserId)?.size === 0) stage.blocked.delete(buyerUserId);
  }
  if (action !== "off") await setAllowedSources(liveId, identity, allowedSources(liveId, buyerUserId));
  announce(liveId);
  return stageView(liveId);
};

/** Every buyer at once: mute all mics now, and/or switch mics / cameras off (or back on) for everyone. */
export const setStageService = async (
  userId: string,
  liveId: string,
  input: { muteAll?: boolean; mics?: "on" | "off"; cams?: "on" | "off" }
) => {
  await assertHost(userId, liveId);
  const stage = stageOf(liveId);
  if (input.mics) stage.micsOff = input.mics === "off";
  if (input.cams) stage.camsOff = input.cams === "off";

  const buyers = (await listRoomPeople(liveId)).filter((person) => buyerId(person.identity));
  await Promise.all(
    buyers.map(async (person) => {
      const id = buyerId(person.identity) as string;
      if (input.muteAll || input.mics === "off") await muteSource(liveId, person.identity, "microphone");
      if (input.cams === "off") await muteSource(liveId, person.identity, "camera");
      if (input.mics || input.cams) await setAllowedSources(liveId, person.identity, allowedSources(liveId, id));
    })
  );
  announce(liveId);
  return stageView(liveId);
};
