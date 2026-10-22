import { NotificationType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { getBlockedUserIds } from "../block/block.service";
import { createNotificationService } from "../notification/notification.service";
import { NIGERIA_UTC_OFFSET_MS, isBirthdayToday, nigeriaToday } from "../../utils/birthday";

// Notification target used for every birthday reminder. The client links
// it to the birthday person's profile (targetId = their user id).
export const BIRTHDAY_TARGET = "BIRTHDAY";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/**
 * Sends today's birthday notifications: a wish to each birthday person and
 * a heads-up to everyone who follows them. Idempotent - a reminder already
 * sent today (same recipient + same birthday person) is never repeated, so
 * it's safe to run hourly, after restarts, or on several instances.
 * Returns how many notifications were sent.
 */
export const sendBirthdayRemindersService = async (now: Date = new Date()) => {
  const today = nigeriaToday(now);
  // Nigeria's midnight expressed in UTC - the start of "today" for de-duping.
  const dayStart = new Date(today.getTime() - NIGERIA_UTC_OFFSET_MS);

  // Day-and-month match is done in code so 29 February birthdays land on
  // 28 February in non-leap years. Only id/name/date are loaded.
  const candidates = await prisma.user.findMany({
    where: { deletedAt: null, dateOfBirth: { not: null } },
    select: { id: true, name: true, dateOfBirth: true },
  });
  const celebrants = candidates.filter((user) => isBirthdayToday(user.dateOfBirth as Date, today));

  if (celebrants.length === 0) return 0;

  const alreadySent = await prisma.notification.findMany({
    where: {
      targetType: BIRTHDAY_TARGET,
      targetId: { in: celebrants.map((user) => user.id) },
      createdAt: { gte: dayStart },
    },
    select: { userId: true, targetId: true },
  });
  const sent = new Set(alreadySent.map((n) => `${n.userId}:${n.targetId}`));

  let count = 0;
  const notify = async (recipientId: string, celebrantId: string, title: string, message: string) => {
    const key = `${recipientId}:${celebrantId}`;
    if (sent.has(key)) return;
    sent.add(key);
    const created = await createNotificationService(recipientId, title, message, NotificationType.SYSTEM, {
      type: BIRTHDAY_TARGET,
      id: celebrantId,
    });
    if (created) count++;
  };

  for (const celebrant of celebrants) {
    const name = firstName(celebrant.name);

    // The notification list shows the message only, so each message must
    // make sense on its own (titles are for email/push-style surfaces).
    await notify(
      celebrant.id,
      celebrant.id,
      `Happy birthday, ${name}! 🎉`,
      `Happy birthday, ${name}! 🎉 Everyone at Nestly is wishing you a wonderful day.`
    );

    const blocked = await getBlockedUserIds(celebrant.id);
    const followers = await prisma.follow.findMany({
      where: {
        followingId: celebrant.id,
        follower: { deletedAt: null },
        ...(blocked.length ? { followerId: { notIn: blocked } } : {}),
      },
      select: { followerId: true },
    });

    for (const { followerId } of followers) {
      await notify(
        followerId,
        celebrant.id,
        `🎂 It's ${celebrant.name}'s birthday today`,
        `🎂 It's ${celebrant.name}'s birthday today! Send ${name} a wish - or a gift from the marketplace.`
      );
    }
  }

  return count;
};
