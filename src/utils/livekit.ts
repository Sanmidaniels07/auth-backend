import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";

import { AppError } from "./appError";

// Live video runs on LiveKit Cloud (WebRTC, under a second of delay). Nestly
// only hands out short-lived join tokens: the seller's can publish camera
// and mic; signed-in buyers can turn on their own mic / camera (like a
// meeting) unless the seller has switched that off; guests can only watch. Chat, pins and viewer counts go
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

export type MediaSource = "microphone" | "camera";
const SOURCE: Record<MediaSource, TrackSource> = { microphone: TrackSource.MICROPHONE, camera: TrackSource.CAMERA };
export const toTrackSources = (sources: MediaSource[]) => sources.map((source) => SOURCE[source]);

interface JoinTokenOptions {
  liveId: string;
  identity: string;
  name: string;
  // The seller: any source. Buyers: only these (empty = watch only).
  host?: boolean;
  sources?: MediaSource[];
  // Guests are hidden from the participant list.
  hidden?: boolean;
  metadata?: string;
}

/** A token to join one live's room. */
export const createJoinToken = async ({ liveId, identity, name, host = false, sources = [], hidden = false, metadata }: JoinTokenOptions) => {
  const { url, apiKey, apiSecret } = assertConfigured();
  const token = new AccessToken(apiKey, apiSecret, { identity, name, metadata, ttl: host ? "3h" : "4h" });
  token.addGrant({
    room: liveRoomName(liveId),
    roomJoin: true,
    canSubscribe: true,
    canPublish: host || sources.length > 0,
    ...(host ? {} : { canPublishSources: toTrackSources(sources) }),
    canPublishData: false,
    hidden,
  });
  return { url, token: await token.toJwt() };
};

const roomService = () => {
  const { url, apiKey, apiSecret } = config();
  return new RoomServiceClient(url.replace(/^wss?:\/\//, "https://"), apiKey, apiSecret);
};

/** Everyone in the room except hidden guests (the seller included). */
export const listRoomPeople = async (liveId: string) => {
  assertConfigured();
  try {
    return await roomService().listParticipants(liveRoomName(liveId));
  } catch {
    return []; // No room yet.
  }
};

/** Mutes a buyer's mic or camera (they can turn it back on unless it's locked). */
export const muteSource = async (liveId: string, identity: string, source: MediaSource) => {
  const people = await listRoomPeople(liveId);
  const person = people.find((p) => p.identity === identity);
  if (!person) return false;
  const tracks = person.tracks.filter((track) => track.source === SOURCE[source] && !track.muted);
  await Promise.all(tracks.map((track) => roomService().mutePublishedTrack(liveRoomName(liveId), identity, track.sid, true)));
  return true;
};

/** Sets what a buyer is allowed to turn on (permissions are replaced as a whole). */
export const setAllowedSources = async (liveId: string, identity: string, sources: MediaSource[]) => {
  try {
    await roomService().updateParticipant(liveRoomName(liveId), identity, {
      permission: { canSubscribe: true, canPublish: sources.length > 0, canPublishData: false, canPublishSources: toTrackSources(sources), hidden: false },
    });
  } catch {
    // They've left the room - their next token uses the new rules anyway.
  }
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
