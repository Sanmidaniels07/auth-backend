import prisma from "../../prisma/prisma";
import { extractHashtags } from "../../utils/hashtag";

export const syncPostHashtags = async (
  postId: string,
  content: string
) => {
  const tags = extractHashtags(content);

  await prisma.postHashtag.deleteMany({
    where: { postId },
  });

  for (const tag of tags) {
    const hashtag = await prisma.hashtag.upsert({
      where: { tag },
      create: { tag },
      update: {},
    });

    await prisma.postHashtag.create({
      data: { postId, hashtagId: hashtag.id },
    });
  }
};

export const getTrendingHashtagsService = async (
  limit: number,
  days: number
) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const grouped = await prisma.postHashtag.groupBy({
    by: ["hashtagId"],
    where: { createdAt: { gte: since } },
    _count: { hashtagId: true },
    orderBy: { _count: { hashtagId: "desc" } },
    take: limit,
  });

  const hashtags = await prisma.hashtag.findMany({
    where: { id: { in: grouped.map((g) => g.hashtagId) } },
  });

  const hashtagMap = new Map(
    hashtags.map((hashtag) => [hashtag.id, hashtag])
  );

  return grouped
    .map((g) => ({
      hashtag: hashtagMap.get(g.hashtagId),
      postCount: g._count.hashtagId,
    }))
    .filter((entry) => entry.hashtag);
};

export const getPostsByHashtagService = async (
  tag: string,
  page: number,
  limit: number
) => {
  const hashtag = await prisma.hashtag.findUnique({
    where: { tag: tag.toLowerCase() },
  });

  if (!hashtag) {
    return { posts: [], total: 0, page, limit, totalPages: 0 };
  }

  const skip = (page - 1) * limit;

  const where = {
    hashtagId: hashtag.id,
    post: { isDeleted: false },
  };

  const [postHashtags, total] = await Promise.all([
    prisma.postHashtag.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
              },
            },
            _count: { select: { likes: true } },
          },
        },
      },
    }),
    prisma.postHashtag.count({ where }),
  ]);

  return {
    posts: postHashtags.map((ph) => ph.post),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};