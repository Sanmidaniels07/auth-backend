import { OrderStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { getBlockedUserIds } from "../block/block.service";
import { REVENUE_STATUSES } from "../../utils/sellerRevenue";

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
];

const BIRTHDAY_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// All day maths is in UTC so bucket keys (ISO dates) line up with the
// range start - mixing local midnight with UTC keys drops "today".
const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

// Next time this date-of-birth comes round, from today (today counts).
const nextBirthday = (dob: Date, today: Date) => {
  const next = new Date(Date.UTC(today.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()));
  if (next < today) next.setUTCFullYear(today.getUTCFullYear() + 1);
  return next;
};

// One call that powers the whole personal dashboard: social reach, an
// activity trend, shopping, communities/events, inbox counts, upcoming
// birthdays among people you follow, and whether you sell on Nestly (the
// seller numbers themselves come from /api/seller/dashboard).
export const getUserDashboardService = async (
  userId: string,
  days: number
) => {
  const now = new Date();
  const today = startOfDay(now);
  const since = new Date(today.getTime() - (days - 1) * DAY_MS);
  const blockedIds = await getBlockedUserIds(userId);
  const notBlocked = blockedIds.length ? { notIn: blockedIds } : undefined;

  const [
    followers,
    following,
    posts,
    likesReceived,
    commentsReceived,
    profileViews,
    recentLikes,
    recentViews,
    recentFollowers,
    orderStats,
    activeOrders,
    awaitingConfirmation,
    wishlistCount,
    cart,
    communitiesJoined,
    upcomingEvents,
    unreadNotifications,
    unreadMessages,
    followedWithBirthdays,
    seller,
  ] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId, followerId: notBlocked } }),
    prisma.follow.count({ where: { followerId: userId, followingId: notBlocked } }),
    prisma.post.count({ where: { authorId: userId, isDeleted: false } }),
    prisma.like.count({
      where: { post: { authorId: userId, isDeleted: false }, userId: { not: userId } },
    }),
    prisma.comment.count({
      where: { post: { authorId: userId, isDeleted: false }, userId: { not: userId } },
    }),
    prisma.profileView.count({ where: { profileUserId: userId, viewedAt: { gte: since } } }),
    prisma.like.findMany({
      where: {
        post: { authorId: userId, isDeleted: false },
        userId: { not: userId },
        createdAt: { gte: since },
      },
      select: { createdAt: true },
    }),
    prisma.profileView.findMany({
      where: { profileUserId: userId, viewedAt: { gte: since } },
      select: { viewedAt: true },
    }),
    prisma.follow.findMany({
      where: { followingId: userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.order.aggregate({
      where: { userId, status: { in: REVENUE_STATUSES } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.order.count({ where: { userId, status: { in: ACTIVE_ORDER_STATUSES } } }),
    prisma.orderItem.count({
      where: { order: { userId }, status: "DELIVERED", deliveryConfirmedAt: null },
    }),
    prisma.wishlist.count({ where: { userId } }),
    prisma.cart.findUnique({
      where: { userId },
      select: { items: { select: { quantity: true } } },
    }),
    prisma.communityMember.count({ where: { userId } }),
    prisma.event.findMany({
      where: {
        startAt: { gte: now },
        OR: [
          { creatorId: userId },
          { attendees: { some: { userId, status: "GOING" } } },
        ],
      },
      orderBy: { startAt: "asc" },
      take: 3,
      select: { id: true, title: true, startAt: true, location: true, coverImage: true },
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: userId },
        conversation: { participants: { some: { userId } } },
      },
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        dateOfBirth: { not: null },
        followers: { some: { followerId: userId } },
        id: notBlocked,
      },
      select: { id: true, name: true, username: true, avatar: true, dateOfBirth: true },
    }),
    prisma.sellerProfile.findUnique({
      where: { userId },
      select: { status: true, store: { select: { id: true, name: true, slug: true } } },
    }),
  ]);

  // Daily buckets for the activity chart - every day in the range is
  // present, so the chart doesn't skip quiet days.
  const buckets = new Map<string, { date: string; likes: number; views: number; followers: number }>();
  for (let i = 0; i < days; i++) {
    const key = dateKey(new Date(since.getTime() + i * DAY_MS));
    buckets.set(key, { date: key, likes: 0, views: 0, followers: 0 });
  }
  recentLikes.forEach((l) => { const b = buckets.get(dateKey(l.createdAt)); if (b) b.likes++; });
  recentViews.forEach((v) => { const b = buckets.get(dateKey(v.viewedAt)); if (b) b.views++; });
  recentFollowers.forEach((f) => { const b = buckets.get(dateKey(f.createdAt)); if (b) b.followers++; });

  const upcomingBirthdays = followedWithBirthdays
    .map((person) => {
      const date = nextBirthday(person.dateOfBirth as Date, today);
      return {
        id: person.id,
        name: person.name,
        username: person.username,
        avatar: person.avatar,
        date: date.toISOString(),
        daysAway: Math.round((date.getTime() - today.getTime()) / DAY_MS),
      };
    })
    .filter((person) => person.daysAway <= BIRTHDAY_WINDOW_DAYS)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 5);

  return {
    range: { days, since: since.toISOString() },
    social: {
      followers,
      following,
      posts,
      likesReceived,
      commentsReceived,
      profileViews,
      newFollowers: recentFollowers.length,
      newLikes: recentLikes.length,
    },
    activity: Array.from(buckets.values()),
    shopping: {
      totalOrders: orderStats._count,
      activeOrders,
      // Delivered items the buyer still needs to confirm (or report).
      awaitingConfirmation,
      totalSpent: orderStats._sum.total ?? 0,
      wishlistCount,
      cartItems: cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    },
    community: {
      communitiesJoined,
      upcomingEvents,
    },
    inbox: {
      unreadNotifications,
      unreadMessages,
    },
    upcomingBirthdays,
    seller: seller
      ? { status: seller.status, hasStore: !!seller.store, store: seller.store }
      : null,
  };
};
