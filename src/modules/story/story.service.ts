import { MediaType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
};

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export const createStoryService = async (
  authorId: string,
  mediaUrl: string,
  mediaType: MediaType,
  caption?: string
) => {
  const expiresAt = new Date(Date.now() + STORY_TTL_MS);

  return prisma.story.create({
    data: { authorId, mediaUrl, mediaType, caption, expiresAt },
  });
};

export const getActiveStoriesFeedService = async (
  userId: string
) => {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const authorIds = [
    userId,
    ...following.map((f) => f.followingId),
  ];

  const stories = await prisma.story.findMany({
    where: {
      authorId: { in: authorIds },
      expiresAt: { gt: new Date() },
    },
    include: {
      author: { select: AUTHOR_SELECT },
      views: {
        where: { viewerId: userId },
        select: { id: true },
      },
      _count: { select: { reactions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  interface AuthorGroup {
    author: (typeof stories)[number]["author"];
    stories: unknown[];
    hasUnseen: boolean;
  }

  const groups = new Map<string, AuthorGroup>();

  for (const story of stories) {
    const { views, _count, ...storyData } = story;
    const seen = views.length > 0;
    const storyWithCount = {
      ...storyData,
      reactionCount: _count.reactions,
      seenByMe: seen,
    };

    const existing = groups.get(story.authorId);

    if (existing) {
      existing.stories.push(storyWithCount);
      if (!seen) existing.hasUnseen = true;
    } else {
      groups.set(story.authorId, {
        author: story.author,
        stories: [storyWithCount],
        hasUnseen: !seen,
      });
    }
  }

  const result = Array.from(groups.values());

  result.sort((a, b) => {
    if (a.author.id === userId) return -1;
    if (b.author.id === userId) return 1;

    const aLatest: any = a.stories[a.stories.length - 1];
    const bLatest: any = b.stories[b.stories.length - 1];

    return (
      new Date(bLatest.createdAt).getTime() -
      new Date(aLatest.createdAt).getTime()
    );
  });

  return result;
};

export const getStoryByIdService = async (
  storyId: string,
  viewerId: string
) => {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: {
      author: { select: AUTHOR_SELECT },
      _count: {
        select: { views: true, reactions: true },
      },
    },
  });

  if (!story) {
    throw new AppError("Story not found.", 404);
  }

  if (viewerId !== story.authorId) {
    await prisma.storyView.upsert({
      where: {
        storyId_viewerId: { storyId, viewerId },
      },
      create: { storyId, viewerId },
      update: {},
    });
  }

  const myReaction = await prisma.storyReaction.findUnique({
    where: {
      storyId_userId: { storyId, userId: viewerId },
    },
    select: { emoji: true },
  });

  return { ...story, myReaction: myReaction?.emoji ?? null };
};

export const deleteStoryService = async (
  userId: string,
  storyId: string
) => {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
  });

  if (!story) {
    throw new AppError("Story not found.", 404);
  }

  if (story.authorId !== userId) {
    throw new AppError(
      "You are not authorized to delete this story.",
      403
    );
  }

  await prisma.story.delete({ where: { id: storyId } });
};

export const getStoryViewersService = async (
  userId: string,
  storyId: string,
  page: number,
  limit: number
) => {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
  });

  if (!story) {
    throw new AppError("Story not found.", 404);
  }

  if (story.authorId !== userId) {
    throw new AppError(
      "You are not authorized to view this.",
      403
    );
  }

  const skip = (page - 1) * limit;

  const [views, total] = await Promise.all([
    prisma.storyView.findMany({
      where: { storyId },
      skip,
      take: limit,
      orderBy: { viewedAt: "desc" },
      include: {
        viewer: { select: AUTHOR_SELECT },
      },
    }),
    prisma.storyView.count({ where: { storyId } }),
  ]);

  return {
    views,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const reactToStoryService = async (
  userId: string,
  storyId: string,
  emoji: string
) => {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
  });

  if (!story) {
    throw new AppError("Story not found.", 404);
  }

  return prisma.storyReaction.upsert({
    where: {
      storyId_userId: { storyId, userId },
    },
    create: { storyId, userId, emoji },
    update: { emoji },
  });
};

export const removeStoryReactionService = async (
  userId: string,
  storyId: string
) => {
  const existing = await prisma.storyReaction.findUnique({
    where: {
      storyId_userId: { storyId, userId },
    },
  });

  if (!existing) {
    throw new AppError(
      "You have not reacted to this story.",
      404
    );
  }

  await prisma.storyReaction.delete({
    where: { id: existing.id },
  });
};
