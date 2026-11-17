import { GroupGiftStatus, LiveStatus, ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { getBlockedUserIds } from "../block/block.service";
import { POST_INCLUDE, withPostExtras } from "../posts/post.service";
import { DAY_MS, nextBirthday, nigeriaToday } from "../../utils/birthday";

// The shopping feed: what's actually happening on Nestly, not just posts.
//
// Stream (newest first, paged by time):
//   PURCHASE - someone bought and reviewed something (reviews can only be
//              written for items that were delivered - real purchases)
//   DROP     - a store added new items (grouped per store per day)
//   POST     - posts; ones that tag a product rank above plain ones
// Highlights (first page only): stores live now, birthdays this week among
// people you follow, and group gifts they started that you could join.
//
// Personal first (people and stores you follow); when that's thin - a new
// account, a quiet week - it's filled from good activity across Nestly so
// the feed is never empty.

const MIN_PERSONAL = 8;
const DROP_LOOKBACK_DAYS = 14;
// Within a page, how much later than its real time an item is treated:
// purchases and drops rise, plain posts sink (minutes).
const BOOST_MINUTES = { PURCHASE: 180, DROP: 120, TAGGED_POST: 60, POST: -720 } as const;

type Reason = "FOLLOWING" | "POPULAR";

const productCard = {
  select: {
    id: true,
    title: true,
    price: true,
    status: true,
    // The cover photo (isPrimary first).
    images: { orderBy: { isPrimary: "desc" as const }, take: 1, select: { url: true } },
    store: { select: { id: true, name: true, slug: true, logo: true, isVerified: true, isSuspended: true } },
  },
} as const;

const toProduct = (product: {
  id: string;
  title: string;
  price: number;
  images: { url: string }[];
  store: { name: string; slug: string; logo: string | null; isVerified: boolean };
}) => ({
  id: product.id,
  title: product.title,
  price: product.price,
  image: product.images[0]?.url ?? null,
  store: { name: product.store.name, slug: product.store.slug, logo: product.store.logo, isVerified: product.store.isVerified },
});

const buyable = { status: ProductStatus.PUBLISHED, store: { isSuspended: false } };

// ---------------------------------------------------------------------------
// Sources

const purchases = async (before: Date, take: number, userIds: string[] | null, blocked: string[]) => {
  const reviews = await prisma.review.findMany({
    where: {
      createdAt: { lt: before },
      product: buyable,
      user: { deletedAt: null, isGuest: false },
      ...(userIds
        ? { userId: { in: userIds } }
        : // Across Nestly: happy buyers who said something or showed it.
          { rating: { gte: 4 }, OR: [{ comment: { not: null } }, { images: { isEmpty: false } }], userId: { notIn: blocked } }),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      rating: true,
      comment: true,
      images: true,
      createdAt: true,
      user: { select: { id: true, name: true, username: true, avatar: true } },
      product: productCard,
    },
  });
  return reviews.map((review) => ({
    type: "PURCHASE" as const,
    id: `purchase-${review.id}`,
    at: review.createdAt,
    buyer: review.user,
    rating: review.rating,
    comment: review.comment,
    images: review.images,
    product: toProduct(review.product),
  }));
};

const drops = async (before: Date, take: number, storeIds: string[] | null) => {
  const products = await prisma.product.findMany({
    where: {
      ...buyable,
      createdAt: { lt: before, gte: new Date(before.getTime() - DROP_LOOKBACK_DAYS * DAY_MS) },
      ...(storeIds ? { storeId: { in: storeIds } } : { store: { isSuspended: false, isVerified: true } }),
    },
    orderBy: { createdAt: "desc" },
    take: take * 3,
    ...productCard,
    select: { ...productCard.select, createdAt: true, storeId: true },
  });

  // One card per store per day: "Tola's Bakes added 3 new items".
  const groups = new Map<string, typeof products>();
  for (const product of products) {
    const key = `${product.storeId}:${product.createdAt.toISOString().slice(0, 10)}`;
    groups.set(key, [...(groups.get(key) ?? []), product]);
  }
  return Array.from(groups.entries())
    .slice(0, take)
    .map(([key, items]) => ({
      type: "DROP" as const,
      id: `drop-${key}`,
      at: items[0].createdAt,
      store: { name: items[0].store.name, slug: items[0].store.slug, logo: items[0].store.logo, isVerified: items[0].store.isVerified },
      products: items.slice(0, 8).map(toProduct),
      total: items.length,
    }));
};

const posts = async (before: Date, take: number, authorIds: string[] | null, blocked: string[], viewerId: string) => {
  const rows = await prisma.post.findMany({
    where: {
      isDeleted: false,
      createdAt: { lt: before },
      ...(authorIds
        ? { authorId: { in: authorIds } }
        : // Across Nestly: posts that show something you can buy.
          { productId: { not: null }, authorId: { notIn: blocked } }),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: POST_INCLUDE,
  });
  const liked = rows.length
    ? new Set(
        (await prisma.like.findMany({ where: { userId: viewerId, postId: { in: rows.map((p) => p.id) } }, select: { postId: true } })).map(
          (like) => like.postId
        )
      )
    : new Set<string>();
  return rows.map((row) => {
    const post = withPostExtras(row, liked.has(row.id));
    return { type: "POST" as const, id: `post-${row.id}`, at: row.createdAt, tagged: !!post.product, post };
  });
};

type FeedItem =
  | Awaited<ReturnType<typeof purchases>>[number]
  | Awaited<ReturnType<typeof drops>>[number]
  | Awaited<ReturnType<typeof posts>>[number];

const boostOf = (item: FeedItem) =>
  item.type === "POST" ? (item.tagged ? BOOST_MINUTES.TAGGED_POST : BOOST_MINUTES.POST) : BOOST_MINUTES[item.type];

// ---------------------------------------------------------------------------
// Highlights (top of the feed)

const highlights = async (viewerId: string, followingIds: string[], storeIds: string[], blocked: string[]) => {
  const [liveNow, people, groupGifts] = await Promise.all([
    prisma.liveSession.findMany({
      where: {
        status: LiveStatus.LIVE,
        store: { isSuspended: false },
        ...(storeIds.length ? { OR: [{ storeId: { in: storeIds } }, { store: { isVerified: true } }] } : {}),
      },
      orderBy: { startedAt: "desc" },
      take: 8,
      select: { code: true, title: true, coverImage: true, startedAt: true, storeId: true, store: { select: { name: true, slug: true, logo: true } } },
    }),
    followingIds.length
      ? prisma.user.findMany({
          where: { id: { in: followingIds }, deletedAt: null, dateOfBirth: { not: null } },
          select: { id: true, name: true, username: true, avatar: true, dateOfBirth: true },
        })
      : Promise.resolve([]),
    followingIds.length
      ? prisma.groupGift.findMany({
          where: {
            status: GroupGiftStatus.OPEN,
            organizerId: { in: followingIds },
            deadline: { gt: new Date() },
            // Never spoil the surprise.
            NOT: { recipientId: viewerId },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            code: true,
            recipientName: true,
            target: true,
            deadline: true,
            organizer: { select: { name: true, avatar: true } },
            product: { select: { title: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } },
            contributions: { where: { status: "PAID" }, select: { amount: true, refundedAmount: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const today = nigeriaToday();
  const birthdays = people
    .filter((person) => !blocked.includes(person.id))
    .map((person) => {
      const next = nextBirthday(person.dateOfBirth as Date, today);
      return { ...person, inDays: Math.round((next.getTime() - today.getTime()) / DAY_MS) };
    })
    .filter((person) => person.inDays <= 7)
    .sort((a, b) => a.inDays - b.inDays)
    .slice(0, 8)
    .map(({ dateOfBirth: _dob, ...person }) => person);

  return {
    // People's own stores first.
    live: liveNow
      .sort((a, b) => Number(storeIds.includes(b.storeId)) - Number(storeIds.includes(a.storeId)))
      .map(({ storeId: _storeId, ...live }) => live),
    birthdays,
    groupGifts: groupGifts.map((gift) => {
      const raised = gift.contributions.reduce((sum, c) => sum + c.amount - c.refundedAmount, 0);
      return {
        code: gift.code,
        recipientName: gift.recipientName,
        organizer: gift.organizer,
        product: { title: gift.product.title, image: gift.product.images[0]?.url ?? null },
        target: gift.target,
        raised,
        deadline: gift.deadline,
      };
    }),
  };
};

// ---------------------------------------------------------------------------

/**
 * One page of the shopping feed, older than `before` (the previous page's
 * `nextBefore`; omit for the first page, which also carries highlights).
 */
export const getShoppingFeedService = async (viewerId: string, beforeInput?: Date, limit = 20) => {
  const before = beforeInput ?? new Date();
  const first = !beforeInput;

  const [follows, storeFollows, blocked] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }),
    prisma.storeFollow.findMany({ where: { userId: viewerId }, select: { storeId: true } }),
    getBlockedUserIds(viewerId),
  ]);
  const followingIds = follows.map((f) => f.followingId).filter((id) => !blocked.includes(id));
  const storeIds = storeFollows.map((f) => f.storeId);
  const people = [viewerId, ...followingIds];

  const personal: FeedItem[] = [
    ...(await purchases(before, limit, followingIds, blocked)),
    ...(storeIds.length ? await drops(before, limit, storeIds) : []),
    ...(await posts(before, limit, people, blocked, viewerId)),
  ];

  // Thin network: fill from good activity across Nestly (not repeating).
  let items = personal.map((item) => ({ ...item, reason: "FOLLOWING" as Reason }));
  if (personal.length < MIN_PERSONAL) {
    const seen = new Set(personal.map((item) => item.id));
    const wider = [
      ...(await purchases(before, limit, null, blocked)),
      ...(await drops(before, Math.ceil(limit / 2), null)),
      ...(await posts(before, limit, null, blocked, viewerId)),
    ].filter((item) => !seen.has(item.id));
    items = [...items, ...wider.map((item) => ({ ...item, reason: "POPULAR" as Reason }))];
  }

  // Page by real time; within the page, rank with the boosts.
  const page = items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
  const nextBefore = page.length === limit ? page[page.length - 1].at : null;
  const ranked = page.sort((a, b) => b.at.getTime() + boostOf(b) * 60_000 - (a.at.getTime() + boostOf(a) * 60_000));

  return {
    items: ranked,
    nextBefore,
    highlights: first ? await highlights(viewerId, followingIds, storeIds, blocked) : null,
  };
};
