import type { Namespace } from "socket.io";

// The /live Socket.IO namespace, shared with the live services so they can
// push pins, status changes, purchases etc. to everyone watching. Kept in
// its own file so services don't import the socket setup (and vice versa).

let liveNamespace: Namespace | null = null;

export const setLiveNamespace = (namespace: Namespace) => {
  liveNamespace = namespace;
};

export const liveRoom = (liveId: string) => `live:${liveId}`;

// The seller's own sockets also join this, so they aren't counted as viewers
// and can be sent host-only events (time warnings).
export const liveHostRoom = (liveId: string) => `live:${liveId}:host`;

export const emitToLiveHost = (liveId: string, event: string, payload: unknown) => {
  liveNamespace?.to(liveHostRoom(liveId)).emit(event, payload);
};

/** Sends an event to everyone in a live (no-op before the socket server starts, e.g. in scripts). */
export const emitToLive = (liveId: string, event: string, payload: unknown) => {
  liveNamespace?.to(liveRoom(liveId)).emit(event, payload);
};

/** People watching a live right now, not counting the seller (each open tab counts once). */
export const liveViewerCount = (liveId: string) => {
  const rooms = liveNamespace?.adapter.rooms;
  const everyone = rooms?.get(liveRoom(liveId))?.size ?? 0;
  const host = rooms?.get(liveHostRoom(liveId))?.size ?? 0;
  return Math.max(0, everyone - host);
};
