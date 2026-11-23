import { NotificationType, OfferStatus, OrderItemStatus, OrderStatus, ProductStatus, Role, SellerStatus, UserStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { sendEmail } from "../auth/email.services";
import { createNotificationService } from "../notification/notification.service";
import { getForYouService } from "../recommendation/recommendation.service";
import { winbackEmail, WinbackFact, WinbackPick } from "../../templates/winback.template";
import { NIGERIA_UTC_OFFSET_MS, nigeriaToday } from "../../utils/birthday";

// "We miss you" catch-ups, in the app and by email, for anyone - buyer,
// seller or member - who hasn't opened Nestly for AWAY_DAYS. They repeat
// once a week for as long as the person stays away (they don't stop),
// and start over when they come back and leave again. Each one shows what
// really happened while they were away: shop visits, followers, orders and
// offers waiting (sellers), unread messages, new products from stores they
// follow and picks for them. One switch turns them off:
// NotificationType.REMINDER ("We miss you" in Settings -> Notifications).
const AWAY_DAYS = 14;
const EVERY_DAYS = 7; // once a week
const DAY_MS = 24 * 60 * 60 * 1000;

// At most this many go out per day (Nigeria time), across everyone, so other
// emails like order updates stay within the email plan's daily limit. Anyone
// who doesn't get theirs today is first in line tomorrow.
const maxPerDay = () => Number(process.env.WINBACK_MAX_PER_DAY) || 10;
const GAP_MS = 600;

// A seller who just got a "finish setting up" email waits a couple of days.
const AFTER_SETUP_REMINDER_DAYS = 2;

const frontend = () => process.env.FRONTEND_URL ?? "";
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Last time they had Nestly open: socket disconnect, sign-in / token refresh, or sign-up. */
const lastActiveAt = (user: { createdAt: Date; lastSeenAt: Date | null; sessions: { createdAt: Date }[] }) =>
  new Date(Math.max(user.createdAt.getTime(), user.lastSeenAt?.getTime() ?? 0, user.sessions[0]?.createdAt.getTime() ?? 0));

const unreadMessages = (userId: string) =>
  prisma.message.count({
    where: { senderId: { not: userId }, readAt: null, deletedAt: null, conversation: { participants: { some: { userId } } } },
  });

/** What a seller missed at their store since `since`. */
const sellerFacts = async (userId: string, storeId: string, since: Date): Promise<WinbackFact[]> => {
  const hub = `${frontend()}/settings/marketplace`;
  const [views, followers, orders, offers] = await Promise.all([
    prisma.storeView.count({ where: { storeId, viewedAt: { gte: since }, OR: [{ viewerId: null }, { viewerId: { not: userId } }] } }),
    prisma.storeFollow.count({ where: { storeId, createdAt: { gte: since } } }),
    prisma.order.count({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
        items: { some: { product: { storeId }, status: { in: [OrderItemStatus.PENDING, OrderItemStatus.PROCESSING] } } },
      },
    }),
    prisma.offer.count({ where: { storeId, status: OfferStatus.PENDING, createdById: { not: userId } } }),
  ]);
  return [
    { count: orders, label: `${plural(orders, "order")} waiting for you to send`, url: `${hub}?tab=orders` },
    { count: offers, label: `${plural(offers, "offer")} from buyers waiting for your answer`, url: `${frontend()}/messages` },
    { count: views, label: `${plural(views, "visit")} to your shop while you were away`, url: `${hub}?tab=analytics` },
    { count: followers, label: `new ${plural(followers, "follower")}`, url: hub },
  ].filter((fact) => fact.count > 0);
};

/** What a buyer / member missed since `since`. */
const buyerFacts = async (userId: string, since: Date): Promise<WinbackFact[]> => {
  const [newProducts, cartItems, counterOffers] = await Promise.all([
    prisma.product.count({
      where: {
        status: ProductStatus.PUBLISHED,
        createdAt: { gte: since },
        store: { isSuspended: false, followers: { some: { userId } } },
      },
    }),
    prisma.cartItem.count({ where: { cart: { userId }, product: { status: ProductStatus.PUBLISHED } } }),
    prisma.offer.count({ where: { buyerId: userId, status: OfferStatus.PENDING, createdById: { not: userId } } }),
  ]);
  return [
    { count: counterOffers, label: `${plural(counterOffers, "offer")} from sellers waiting for your answer`, url: `${frontend()}/messages` },
    { count: newProducts, label: `new ${plural(newProducts, "product")} from shops you follow`, url: `${frontend()}/marketplace` },
    { count: cartItems, label: `${plural(cartItems, "item")} still in your cart`, url: `${frontend()}/marketplace/cart` },
  ].filter((fact) => fact.count > 0);
};

const picksFor = async (userId: string): Promise<WinbackPick[]> => {
  const picks = await getForYouService(userId, 3).catch(() => []);
  return picks.map((product) => ({
    title: product.title,
    price: product.price,
    storeName: product.store.name,
    imageUrl: product.images[0]?.url ?? null,
    url: `${frontend()}/marketplace/product/${product.id}`,
  }));
};

export const sendWinbackRemindersService = async (now: Date = new Date()) => {
  const awayCutoff = new Date(now.getTime() - AWAY_DAYS * DAY_MS);
  const repeatCutoff = new Date(now.getTime() - EVERY_DAYS * DAY_MS);

  // What's left of today's allowance (the day starts at midnight in Nigeria).
  const dayStart = new Date(nigeriaToday(now).getTime() - NIGERIA_UTC_OFFSET_MS);
  const sentToday = await prisma.user.count({ where: { lastWinbackReminderAt: { gte: dayStart } } });
  const allowance = maxPerDay() - sentToday;
  if (allowance <= 0) return 0;

  const users = await prisma.user.findMany({
    where: {
      createdAt: { lt: awayCutoff },
      deletedAt: null,
      status: UserStatus.ACTIVE,
      isVerified: true,
      // Guest checkouts have no account to come back to; admins are staff.
      isGuest: false,
      role: { not: Role.ADMIN },
      sessions: { none: { createdAt: { gte: awayCutoff } } },
      notificationPreferences: { none: { type: NotificationType.REMINDER, enabled: false } },
      AND: [
        { OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: awayCutoff } }] },
        { OR: [{ lastWinbackReminderAt: null }, { lastWinbackReminderAt: { lte: repeatCutoff } }] },
      ],
    },
    // Longest without a catch-up first, so whoever missed out yesterday goes first.
    orderBy: [{ lastWinbackReminderAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
    take: allowance * 3,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      lastSeenAt: true,
      winbackRemindersSent: true,
      lastWinbackReminderAt: true,
      sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      sellerProfile: { select: { status: true, lastSetupReminderAt: true, store: { select: { id: true, name: true } } } },
    },
  });

  let sent = 0;

  for (const user of users) {
    if (sent >= allowance) break;

    const setupAt = user.sellerProfile?.lastSetupReminderAt;
    if (setupAt && now.getTime() - setupAt.getTime() < AFTER_SETUP_REMINDER_DAYS * DAY_MS) continue;

    const since = lastActiveAt(user);
    // Came back after the last catch-up -> a new time away, count from 1.
    const newTimeAway = !user.lastWinbackReminderAt || user.lastWinbackReminderAt < since;
    const number = newTimeAway ? 1 : user.winbackRemindersSent + 1;

    // Claim it first so overlapping runs can't send it twice.
    const claim = await prisma.user.updateMany({
      where: { id: user.id, lastWinbackReminderAt: user.lastWinbackReminderAt },
      data: { winbackRemindersSent: number, lastWinbackReminderAt: now },
    });
    if (claim.count === 0) continue;

    const store = user.sellerProfile?.status === SellerStatus.APPROVED ? user.sellerProfile.store : null;
    const [messages, facts, picks] = await Promise.all([
      unreadMessages(user.id),
      store ? sellerFacts(user.id, store.id, since) : buyerFacts(user.id, since),
      store ? Promise.resolve([] as WinbackPick[]) : picksFor(user.id),
    ]);
    // Unread messages lead - except a seller's orders to send, which matter most.
    if (messages > 0) {
      const at = store && facts[0]?.url.endsWith("tab=orders") ? 1 : 0;
      facts.splice(at, 0, { count: messages, label: `unread ${plural(messages, "message")}`, url: `${frontend()}/messages` });
    }

    const name = firstName(user.name);
    const heading = number === 1 ? `We miss you, ${name}` : store ? `Your shop misses you, ${name}` : `It's been a while, ${name}`;
    const top = facts[0];
    const message = top
      ? `${top.count.toLocaleString("en-NG")} ${top.label}. Come and see what's new.`
      : store
        ? `Buyers are shopping on Nestly - post something new or go live to bring them to ${store.name}.`
        : "New products and shops are waiting for you on Nestly.";
    const intro = store
      ? facts.length
        ? `here's what happened at ${store.name} since you were last on Nestly:`
        : `buyers are shopping on Nestly every day. Post a new product, share your shop link or go live to bring them to ${store.name}.`
      : facts.length
        ? "here's what you missed on Nestly:"
        : "new products and shops have joined Nestly since you were last here.";

    await Promise.allSettled([
      createNotificationService(user.id, heading, message, NotificationType.REMINDER, {
        type: "WELCOME_BACK",
        id: store ? "seller" : "buyer",
      }),
      sendEmail(
        user.email,
        heading,
        winbackEmail({
          name,
          heading,
          intro,
          facts,
          picks,
          picksTitle: "Picked for you",
          buttonLabel: store ? "Open my Seller Hub" : "Open Nestly",
          buttonUrl: store ? `${frontend()}/settings/marketplace` : `${frontend()}/marketplace`,
          settingsUrl: `${frontend()}/settings/notifications`,
        })
      ),
    ]).then((results) =>
      results.forEach((result) => {
        if (result.status === "rejected") console.error(`Winback reminder to ${user.id} failed:`, result.reason);
      })
    );
    sent += 1;
    await wait(GAP_MS);
  }

  return sent;
};
