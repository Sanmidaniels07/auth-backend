import { LiveStatus, NotificationType, UserStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { sendEmail } from "../auth/email.services";
import { createNotificationService } from "../notification/notification.service";
import { liveReminderEmail } from "../../templates/live-emails.template";

// Who hears about a live, and when:
//  - announced:   the store's followers (app + push), once, when it's scheduled
//  - 24h before:  people who tapped "Remind me" (app + email)
//  - 15 min before: "Remind me" people (app + push + email); the seller too
//  - live now:    "Remind me" people (app + push + email) and followers (app + push)
//  - moved / cancelled: "Remind me" people (app + push)
// All use NotificationType.LIVE, so one switch in Settings turns them off
// (email included).

const frontend = () => process.env.FRONTEND_URL ?? "";
export const livePageUrl = (code: string) => `${frontend()}/live/${code}`;
const settingsUrl = () => `${frontend()}/settings/notifications`;

const LAGOS_TIME = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const LAGOS_CLOCK = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit" });

/** e.g. "Fri, 14 Nov, 7:00 pm" (Nigeria time). */
export const liveWhen = (date: Date) => LAGOS_TIME.format(date);

const LIVE_FOR_NOTICE = {
  id: true,
  code: true,
  title: true,
  coverImage: true,
  scheduledAt: true,
  store: { select: { name: true, id: true, seller: { select: { userId: true } } } },
} as const;

type NoticeLive = {
  id: string;
  code: string;
  title: string;
  coverImage: string | null;
  scheduledAt: Date;
  store: { name: string; id: string; seller: { userId: string } };
};

const target = (live: { code: string }) => ({ type: "LIVE", id: live.code });

const liveEmailsOn = async (userId: string) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type: NotificationType.LIVE } },
  });
  return preference?.enabled ?? true;
};

const interestedUsers = (liveId: string) =>
  prisma.liveInterest.findMany({
    where: { liveSessionId: liveId, user: { status: UserStatus.ACTIVE } },
    select: { user: { select: { id: true, name: true, email: true } } },
  });

const notifyAll = async (userIds: string[], title: string, message: string, live: { code: string }) => {
  let sent = 0;
  for (const userId of userIds) {
    const created = await createNotificationService(userId, title, message, NotificationType.LIVE, target(live)).catch(() => null);
    if (created) sent += 1;
  }
  return sent;
};

const emailInterested = async (
  live: NoticeLive,
  users: { id: string; name: string; email: string }[],
  copy: { subject: string; eyebrow: string; heading: string; intro: string; buttonLabel: string }
) => {
  for (const user of users) {
    if (!(await liveEmailsOn(user.id))) continue;
    const html = liveReminderEmail({
      name: user.name.split(/\s+/)[0] || user.name,
      preheader: copy.subject,
      eyebrow: copy.eyebrow,
      heading: copy.heading,
      intro: copy.intro,
      liveTitle: live.title,
      storeName: live.store.name,
      when: liveWhen(live.scheduledAt),
      coverImage: live.coverImage,
      buttonLabel: copy.buttonLabel,
      url: livePageUrl(live.code),
      settingsUrl: settingsUrl(),
    });
    await sendEmail(user.email, copy.subject, html).catch((error) => console.error("Live email failed:", error));
  }
};

const followerIds = async (storeId: string, exclude: string[]) => {
  const followers = await prisma.storeFollow.findMany({
    where: { storeId, userId: { notIn: exclude }, user: { status: UserStatus.ACTIVE } },
    select: { userId: true },
  });
  return followers.map((follower) => follower.userId);
};

/** A store's followers hear about a newly scheduled live. */
export const announceLive = async (live: NoticeLive) => {
  const ids = await followerIds(live.store.id, [live.store.seller.userId]);
  return notifyAll(
    ids,
    `${live.store.name} is going live`,
    `"${live.title}" - ${liveWhen(live.scheduledAt)}. Tap "Remind me" so you don't miss it.`,
    live
  );
};

export const sendDayReminder = async (live: NoticeLive) => {
  const users = (await interestedUsers(live.id)).map((row) => row.user);
  await notifyAll(
    users.map((user) => user.id),
    `Tomorrow: ${live.store.name} live`,
    `"${live.title}" starts ${liveWhen(live.scheduledAt)}.`,
    live
  );
  await emailInterested(live, users, {
    subject: `Reminder: ${live.store.name} goes live ${liveWhen(live.scheduledAt)}`,
    eyebrow: "Live tomorrow",
    heading: "Don't miss it",
    intro: `${live.store.name} goes live soon - here's your reminder.`,
    buttonLabel: "See the live",
  });
  return users.length;
};

export const sendSoonReminder = async (live: NoticeLive) => {
  const users = (await interestedUsers(live.id)).map((row) => row.user);
  await notifyAll(
    users.map((user) => user.id),
    `${live.store.name} goes live in 15 minutes`,
    `"${live.title}" starts at ${LAGOS_CLOCK.format(live.scheduledAt)}. Get ready!`,
    live
  );
  await emailInterested(live, users, {
    subject: `${live.store.name} goes live in 15 minutes`,
    eyebrow: "Starting soon",
    heading: "Live in 15 minutes",
    intro: `${live.store.name} is about to go live. Join on time - the best deals go fast.`,
    buttonLabel: "Open the live",
  });
  return users.length;
};

export const sendHostReminder = async (live: NoticeLive) =>
  createNotificationService(
    live.store.seller.userId,
    "Your live starts in 15 minutes",
    `"${live.title}" - open your live studio, check your camera and go live when you're ready.`,
    NotificationType.LIVE,
    { type: "LIVE_STUDIO", id: live.id }
  ).catch(() => null);

export const notifyLiveStarted = async (liveId: string) => {
  // Claimed once, however the live was started.
  const claimed = await prisma.liveSession.updateMany({ where: { id: liveId, liveNoticeSentAt: null }, data: { liveNoticeSentAt: new Date() } });
  if (!claimed.count) return;

  const live = await prisma.liveSession.findUniqueOrThrow({ where: { id: liveId }, select: LIVE_FOR_NOTICE });
  const users = (await interestedUsers(liveId)).map((row) => row.user);
  const interestedIds = users.map((user) => user.id);

  await notifyAll(interestedIds, `🔴 ${live.store.name} is live now`, `"${live.title}" - join now and shop live.`, live);
  await notifyAll(
    await followerIds(live.store.id, [live.store.seller.userId, ...interestedIds]),
    `🔴 ${live.store.name} is live now`,
    `"${live.title}" - tap to watch and shop.`,
    live
  );
  await emailInterested(live, users, {
    subject: `🔴 ${live.store.name} is live now`,
    eyebrow: "Live now",
    heading: "We're live!",
    intro: `${live.store.name} just went live. Come in, ask questions and shop the deals.`,
    buttonLabel: "Watch now",
  });
};

export const notifyLiveRescheduled = async (liveId: string) => {
  const live = await prisma.liveSession.findUniqueOrThrow({ where: { id: liveId }, select: LIVE_FOR_NOTICE });
  const users = await interestedUsers(liveId);
  return notifyAll(
    users.map((row) => row.user.id),
    `${live.store.name} moved their live`,
    `"${live.title}" is now ${liveWhen(live.scheduledAt)}. We'll remind you before it starts.`,
    live
  );
};

export const notifyLiveCancelled = async (liveId: string) => {
  const live = await prisma.liveSession.findUniqueOrThrow({
    where: { id: liveId },
    select: { ...LIVE_FOR_NOTICE, status: true, endReason: true },
  });
  if (live.status !== LiveStatus.CANCELLED) return 0;
  const users = await interestedUsers(liveId);
  const reason = live.endReason === "NOT_STARTED" ? "didn't go ahead" : "was cancelled";
  return notifyAll(
    users.map((row) => row.user.id),
    `${live.store.name}'s live ${reason}`,
    `"${live.title}" ${reason}. Follow ${live.store.name} to hear about their next one.`,
    live
  );
};

export { LIVE_FOR_NOTICE };
