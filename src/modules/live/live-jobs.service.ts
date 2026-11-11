import { LiveStatus, NotificationType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { createNotificationService } from "../notification/notification.service";
import { emitToLiveHost } from "../../socket/live-emitter";
import { LIVE_MAX_MINUTES, endLive } from "./live.service";
import {
  LIVE_FOR_NOTICE,
  announceLive,
  notifyLiveCancelled,
  sendDayReminder,
  sendHostReminder,
  sendSoonReminder,
} from "./live-notifications";

// Everything time-based about lives, run every minute by jobs/live.job.ts.
// Each step claims its rows first (a *SentAt column), so overlapping runs or
// several server instances never send anything twice.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Followers hear about a live once it's been saved for a couple of minutes
// (time to fix a typo) - and only if it isn't about to start anyway.
const ANNOUNCE_AFTER_MS = 2 * MINUTE;
const SOON_MS = 15 * MINUTE;
const DAY_MS = 24 * HOUR;
// A scheduled live that hasn't started this long after its time is called off.
const NO_SHOW_MS = 2 * HOUR;
const WARN_BEFORE_END_MS = 5 * MINUTE;

const claim = async (id: string, field: "followersNotifiedAt" | "dayReminderSentAt" | "soonReminderSentAt" | "hostReminderSentAt" | "timeWarningSentAt", now: Date) =>
  (await prisma.liveSession.updateMany({ where: { id, [field]: null }, data: { [field]: now } })).count > 0;

export const announceNewLivesService = async (now = new Date()) => {
  const lives = await prisma.liveSession.findMany({
    where: {
      status: LiveStatus.SCHEDULED,
      followersNotifiedAt: null,
      createdAt: { lte: new Date(now.getTime() - ANNOUNCE_AFTER_MS) },
      store: { isSuspended: false },
    },
    select: LIVE_FOR_NOTICE,
  });
  let sent = 0;
  for (const live of lives) {
    if (!(await claim(live.id, "followersNotifiedAt", now))) continue;
    // Starting within 15 minutes: the "live now" notice is enough.
    if (live.scheduledAt.getTime() - now.getTime() < SOON_MS) continue;
    sent += await announceLive(live);
  }
  return sent;
};

export const sendLiveRemindersService = async (now = new Date()) => {
  let sent = 0;

  // 24 hours before - only for lives scheduled well in advance.
  const tomorrow = await prisma.liveSession.findMany({
    where: {
      status: LiveStatus.SCHEDULED,
      dayReminderSentAt: null,
      scheduledAt: { gt: new Date(now.getTime() + 2 * HOUR), lte: new Date(now.getTime() + DAY_MS) },
      store: { isSuspended: false },
    },
    select: { ...LIVE_FOR_NOTICE, createdAt: true },
  });
  for (const live of tomorrow) {
    if (live.scheduledAt.getTime() - live.createdAt.getTime() < DAY_MS + 2 * HOUR) {
      await claim(live.id, "dayReminderSentAt", now);
      continue;
    }
    if (await claim(live.id, "dayReminderSentAt", now)) sent += await sendDayReminder(live);
  }

  // 15 minutes before - viewers and the seller.
  const soon = await prisma.liveSession.findMany({
    where: {
      status: LiveStatus.SCHEDULED,
      scheduledAt: { gt: now, lte: new Date(now.getTime() + SOON_MS) },
      OR: [{ soonReminderSentAt: null }, { hostReminderSentAt: null }],
      store: { isSuspended: false },
    },
    select: { ...LIVE_FOR_NOTICE, soonReminderSentAt: true, hostReminderSentAt: true },
  });
  for (const live of soon) {
    if (!live.soonReminderSentAt && (await claim(live.id, "soonReminderSentAt", now))) sent += await sendSoonReminder(live);
    if (!live.hostReminderSentAt && (await claim(live.id, "hostReminderSentAt", now))) await sendHostReminder(live);
  }
  return sent;
};

/** Warns the seller 5 minutes before the time limit, then ends the live. */
export const enforceLiveTimeLimitService = async (now = new Date()) => {
  const limit = LIVE_MAX_MINUTES * MINUTE;
  const running = await prisma.liveSession.findMany({
    where: { status: LiveStatus.LIVE, startedAt: { lte: new Date(now.getTime() - (limit - WARN_BEFORE_END_MS)) } },
    select: { id: true, startedAt: true, timeWarningSentAt: true },
  });
  let ended = 0;
  for (const live of running) {
    const elapsed = now.getTime() - live.startedAt!.getTime();
    if (elapsed >= limit) {
      if (await endLive(live.id, "TIME_LIMIT")) ended += 1;
    } else if (!live.timeWarningSentAt && (await claim(live.id, "timeWarningSentAt", now))) {
      emitToLiveHost(live.id, "live:time-warning", { minutesLeft: Math.max(1, Math.round((limit - elapsed) / MINUTE)) });
    }
  }
  return ended;
};

/** Scheduled lives that never started are called off (seller + "Remind me" people told). */
export const cancelNoShowLivesService = async (now = new Date()) => {
  const missed = await prisma.liveSession.findMany({
    where: { status: LiveStatus.SCHEDULED, scheduledAt: { lt: new Date(now.getTime() - NO_SHOW_MS) } },
    select: { id: true, title: true, store: { select: { seller: { select: { userId: true } } } } },
  });
  for (const live of missed) {
    const claimed = await prisma.liveSession.updateMany({
      where: { id: live.id, status: LiveStatus.SCHEDULED },
      data: { status: LiveStatus.CANCELLED, endReason: "NOT_STARTED" },
    });
    if (!claimed.count) continue;
    await notifyLiveCancelled(live.id).catch((error) => console.error("Live no-show notice failed:", error));
    await createNotificationService(
      live.store.seller.userId,
      "Your live didn't start",
      `"${live.title}" was called off because it didn't start within 2 hours of its time. Schedule a new one whenever you're ready.`,
      NotificationType.LIVE,
      { type: "LIVE_STUDIO", id: live.id }
    ).catch(() => null);
  }
  return missed.length;
};
