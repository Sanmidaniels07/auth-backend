import prisma from "../../prisma/prisma";
import { getBlockedUserIds } from "../block/block.service";

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  bio: true,
};

// Public storefront fields only - Store also holds payout bank details,
// which must never leak through search.
const STORE_SELECT = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  city: true,
  state: true,
  isVerified: true,
  rating: true,
};

const storeSearchWhere = (q: string, blockedIds: string[]) => ({
  isSuspended: false,
  name: { contains: q, mode: "insensitive" as const },
  seller: blockedIds.length
    ? { userId: { notIn: blockedIds } }
    : undefined,
});

export const quickSearchService = async (
  q: string,
  viewerId?: string
) => {
  const blockedIds = viewerId
    ? await getBlockedUserIds(viewerId)
    : [];

  const [users, stores, posts, communities, hashtags] =
    await Promise.all([
      prisma.user.findMany({
        where: {
          deletedAt: null,
          id: blockedIds.length
            ? { notIn: blockedIds }
            : undefined,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            {
              username: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        },
        select: USER_SELECT,
        take: 5,
      }),
      prisma.store.findMany({
        where: storeSearchWhere(q, blockedIds),
        select: STORE_SELECT,
        take: 5,
        orderBy: { totalSales: "desc" },
      }),
      prisma.post.findMany({
        where: {
          isDeleted: false,
          authorId: blockedIds.length
            ? { notIn: blockedIds }
            : undefined,
          OR: [
            {
              title: { contains: q, mode: "insensitive" },
            },
            {
              content: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        },
        include: {
          author: { select: USER_SELECT },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.community.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            {
              description: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        },
        take: 5,
      }),
      prisma.hashtag.findMany({
        where: {
          tag: {
            contains: q.replace(/^#/, ""),
            mode: "insensitive",
          },
        },
        take: 5,
      }),
    ]);

  return { users, stores, posts, communities, hashtags };
};

type SearchType = "users" | "stores" | "posts" | "communities" | "hashtags";

export const searchByTypeService = async (
  type: SearchType,
  q: string,
  page: number,
  limit: number,
  viewerId?: string
) => {
  const skip = (page - 1) * limit;
  const blockedIds = viewerId
    ? await getBlockedUserIds(viewerId)
    : [];

  if (type === "users") {
    const where: any = {
      deletedAt: null,
      id: blockedIds.length ? { notIn: blockedIds } : undefined,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
      ],
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  if (type === "stores") {
    const where = storeSearchWhere(q, blockedIds);

    const [items, total] = await Promise.all([
      prisma.store.findMany({
        where,
        select: STORE_SELECT,
        skip,
        take: limit,
        orderBy: { totalSales: "desc" },
      }),
      prisma.store.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  if (type === "posts") {
    const where: any = {
      isDeleted: false,
      authorId: blockedIds.length
        ? { notIn: blockedIds }
        : undefined,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ],
    };

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: { author: { select: USER_SELECT } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.post.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  if (type === "communities") {
    const where = {
      OR: [
        {
          name: {
            contains: q,
            mode: "insensitive" as const,
          },
        },
        {
          description: {
            contains: q,
            mode: "insensitive" as const,
          },
        },
      ],
    };

    const [items, total] = await Promise.all([
      prisma.community.findMany({ where, skip, take: limit }),
      prisma.community.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  const where = {
    tag: {
      contains: q.replace(/^#/, ""),
      mode: "insensitive" as const,
    },
  };

  const [items, total] = await Promise.all([
    prisma.hashtag.findMany({ where, skip, take: limit }),
    prisma.hashtag.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
