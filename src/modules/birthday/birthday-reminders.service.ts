import { NotificationType, WishlistVisibility } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { getBlockedUserIds } from "../block/block.service";
import { createNotificationService } from "../notification/notification.service";
import { DAY_MS, NIGERIA_UTC_OFFSET_MS, isBirthdayToday, nigeriaToday } from "../../utils/birthday";

// Notification target used for every birthday reminder. The client links
// it to the birthday person's profile (targetId = their user id).
export const BIRTHDAY_TARGET = "BIRTHDAY";
// The day-before heads-up. The client links it to their profile wishlist.
export const BIRTHDAY_SOON_TARGET = "BIRTHDAY_SOON";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/**
 * Sends today's birthday notifications: a wish to each birthday person and
 * a heads-up to everyone who follows them, plus a day-before
 * reminder to followers of tomorrow's birthday people (gift time). Idempotent - a reminder already
 * sent today (same recipient + same birthday person) is never repeated, so
 * it's safe to run hourly, after restarts, or on several instances.
 * Returns how many notifications were sent.
 */
export const sendBirthdayRemindersService = async (now: Date = new Date()) => {
  const today = nigeriaToday(now);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  // Nigeria's midnight expressed in UTC - the start of "today" for de-duping.
  const dayStart = new Date(today.getTime() - NIGERIA_UTC_OFFSET_MS);

  // Day-and-month match is done in code so 29 February birthdays land on
  // 28 February in non-leap years. Only what the messages need is loaded.
  const candidates = await prisma.user.findMany({
    where: { deletedAt: null, dateOfBirth: { not: null } },
    select: { id: true, name: true, dateOfBirth: true, wishlistVisibility: true },
  });
  const celebrants = candidates.filter((user) => isBirthdayToday(user.dateOfBirth as Date, today));
  // A day's notice so followers can send a gift in time.
  const upcoming = candidates.filter((user) => isBirthdayToday(user.dateOfBirth as Date, tomorrow));

  if (celebrants.length === 0 && upcoming.length === 0) return 0;

  const alreadySent = await prisma.notification.findMany({
    where: {
      targetType: { in: [BIRTHDAY_TARGET, BIRTHDAY_SOON_TARGET] },
      targetId: { in: [...celebrants, ...upcoming].map((user) => user.id) },
      createdAt: { gte: dayStart },
    },
    select: { userId: true, targetId: true, targetType: true },
  });
  const sent = new Set(alreadySent.map((n) => `${n.targetType}:${n.userId}:${n.targetId}`));

  let count = 0;
  const notify = async (
    targetType: string,
    recipientId: string,
    celebrantId: string,
    title: string,
    message: string
  ) => {
    const key = `${targetType}:${recipientId}:${celebrantId}`;
    if (sent.has(key)) return;
    sent.add(key);
    const created = await createNotificationService(recipientId, title, message, NotificationType.SYSTEM, {
      type: targetType,
      id: celebrantId,
    });
    if (created) count++;
  };

  const followersOf = async (userId: string) => {
    const blocked = await getBlockedUserIds(userId);
    const followers = await prisma.follow.findMany({
      where: {
        followingId: userId,
        follower: { deletedAt: null },
        ...(blocked.length ? { followerId: { notIn: blocked } } : {}),
      },
      select: { followerId: true },
    });
    return followers.map((follow) => follow.followerId);
  };

  for (const celebrant of celebrants) {
    const name = firstName(celebrant.name);

    // The notification list shows the message only, so each message must
    // make sense on its own (titles are for email/push-style surfaces).
    await notify(
      BIRTHDAY_TARGET,
      celebrant.id,
      celebrant.id,
      `Happy birthday, ${name}! 🎉`,
      `Happy birthday, ${name}! 🎉 Everyone at Nestly is wishing you a wonderful day.`
    );

    for (const followerId of await followersOf(celebrant.id)) {
      await notify(
        BIRTHDAY_TARGET,
        followerId,
        celebrant.id,
        `🎂 It's ${celebrant.name}'s birthday today`,
        `🎂 It's ${celebrant.name}'s birthday today! Send ${name} a wish - or a gift from the marketplace.`
      );
    }
  }

  for (const person of upcoming) {
    const name = firstName(person.name);
    // Followers can see the wishlist unless it's private.
    const ideas =
      person.wishlistVisibility === WishlistVisibility.PRIVATE
        ? "Send a gift so it arrives on the day."
        : `See ${name}'s wishlist for gift ideas.`;

    for (const followerId of await followersOf(person.id)) {
      await notify(
        BIRTHDAY_SOON_TARGET,
        followerId,
        person.id,
        `🎂 ${person.name}'s birthday is tomorrow`,
        `🎂 ${person.name}'s birthday is tomorrow! ${ideas}`
      );
    }
  }

  return count;
};
