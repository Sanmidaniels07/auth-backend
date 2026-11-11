import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

import { AppError } from "./appError";

// Live video runs on LiveKit Cloud (WebRTC, under a second of delay). Nestly
// only hands out short-lived join tokens: the seller's can publish camera
// and mic, everyone else's can only watch. Chat, pins and viewer counts go
// over our own Socket.IO (socket/live.ts), so they work even for guests.
//
// Env: LIVEKIT_URL (wss://<project>.livekit.cloud), LIVEKIT_API_KEY,
// LIVEKIT_API_SECRET - from the LiveKit Cloud project's Settings -> Keys.

const config = () => ({
  url: process.env.LIVEKIT_URL ?? "",
  apiKey: process.env.LIVEKIT_API_KEY ?? "",
  apiSecret: process.env.LIVEKIT_API_SECRET ?? "",
});

export const liveVideoConfigured = () => {
  const { url, apiKey, apiSecret } = config();
  return Boolean(url && apiKey && apiSecret);
};

const assertConfigured = () => {
  if (!liveVideoConfigured()) {
    throw new AppError("Live video isn't set up yet. Please try again later.", 503);
  }
  return config();
};

export const liveRoomName = (liveId: string) => `live_${liveId}`;

interface JoinTokenOptions {
  liveId: string;
  identity: string;
  name: string;
  canPublish: boolean;
}

/** A token to join one live's room. Publishers get the full live length; viewers a few hours. */
export const createJoinToken = async ({ liveId, identity, name, canPublish }: JoinTokenOptions) => {
  const { url, apiKey, apiSecret } = assertConfigured();
  const token = new AccessToken(apiKey, apiSecret, { identity, name, ttl: canPublish ? "3h" : "4h" });
  token.addGrant({
    room: liveRoomName(liveId),
    roomJoin: true,
    canSubscribe: true,
    canPublish,
    canPublishData: false,
    // Viewers stay out of the participant list everyone sees.
    hidden: !canPublish,
  });
  return { url, token: await token.toJwt() };
};

const roomService = () => {
  const { url, apiKey, apiSecret } = config();
  return new RoomServiceClient(url.replace(/^wss?:\/\//, "https://"), apiKey, apiSecret);
};

/** Ends the video for everyone (after the live is marked ENDED). Never throws. */
export const closeLiveRoom = async (liveId: string) => {
  if (!liveVideoConfigured()) return;
  try {
    await roomService().deleteRoom(liveRoomName(liveId));
  } catch (error) {
    // The room may already be gone (nobody joined, or LiveKit closed it).
    console.error("Closing live room failed:", (error as Error).message);
  }
};
