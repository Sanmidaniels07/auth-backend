import { MediaType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { syncPostHashtags } from "../hashtag/hashtag.service";

interface MediaInput {
  url: string;
  type: MediaType;
}

const POST_INCLUDE = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  media: {
    orderBy: { order: "asc" as const },
  },
  hashtags: {
    include: { hashtag: true },
  },
  _count: {
    select: { likes: true },
  },
};

const withPostExtras = <
  T extends {
    _count: { likes: number };
    hashtags: { hashtag: { tag: string } }[];
  }
>(
  post: T,
  likedByMe: boolean
) => {
  const { _count, hashtags, ...rest } = post;

  return {
    ...rest,
    likeCount: _count.likes,
    likedByMe,
    hashtags: hashtags.map((ph) => ph.hashtag.tag),
  };
};

export const createPostService = async (
  userId: string,
  data: {
    title: string;
    content: string;
    media?: MediaInput[];
  },
) => {
  const post = await prisma.post.create({
    data: {
      title: data.title,
      content: data.content,
      authorId: userId,
      media: data.media
        ? {
            create: data.media.map((media, index) => ({
              url: media.url,
              type: media.type,
              order: index,
            })),
          }
        : undefined,
    },
    include: POST_INCLUDE,
  });

  await syncPostHashtags(post.id, data.content);

  return withPostExtras(post, false);
};

export const getPostsService = async (
  page: number,
  limit: number,
  search?: string,
  authorId?: string,
  sort?: string,
  userId?: string,
) => {
  const skip = (page - 1) * limit;

  const where: any = {
    isDeleted: false,
  };

  if (search) {
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        content: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (authorId) {
    where.authorId = authorId;
  }

  const posts = await prisma.post.findMany({
    skip,
    take: limit,

    where,

    include: POST_INCLUDE,

    orderBy: {
      createdAt: sort === "asc" ? "asc" : "desc",
    },
  });

  const total = await prisma.post.count({
    where,
  });

  let likedPostIds = new Set<string>();

  if (userId && posts.length > 0) {
    const likes = await prisma.like.findMany({
      where: {
        userId,
        postId: { in: posts.map((post) => post.id) },
      },
      select: { postId: true },
    });

    likedPostIds = new Set(likes.map((like) => like.postId));
  }

  const postsWithExtras = posts.map((post) =>
    withPostExtras(post, likedPostIds.has(post.id))
  );

  return {
    posts: postsWithExtras,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getSinglePostService = async (
  postId: string,
  userId?: string,
) => {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      isDeleted: false,
    },
    include: POST_INCLUDE,
  });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  const like = userId
    ? await prisma.like.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      })
    : null;

  return withPostExtras(post, !!like);
};

export const getPostOwnerService = async (postId: string) => {
  return prisma.post.findFirst({
    where: {
      id: postId,
      isDeleted: false,
    },
  });
};

export const updatePostService = async (
  postId: string,
  userId: string,
  data: {
    title?: string;
    content?: string;
    media?: MediaInput[];
  },
) => {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      isDeleted: false,
    },
  });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  if (post.authorId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  const { media, ...fields } = data;

  const updated = await prisma.$transaction(async (tx) => {
    if (media) {
      await tx.postMedia.deleteMany({
        where: { postId },
      });
    }

    return tx.post.update({
      where: { id: postId },
      data: {
        ...fields,
        media: media
          ? {
              create: media.map((m, index) => ({
                url: m.url,
                type: m.type,
                order: index,
              })),
            }
          : undefined,
      },
      include: POST_INCLUDE,
    });
  });

  if (data.content) {
    await syncPostHashtags(postId, data.content);
  }

  const like = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  return withPostExtras(updated, !!like);
};

export const deletePostService = async (postId: string, userId: string) => {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      isDeleted: false,
    },
  });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  if (post.authorId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  return prisma.post.update({
    where: {
      id: postId,
    },

    data: {
      isDeleted: true,
    },
  });
};

export const restorePostService = async (postId: string) => {
  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
  });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  return prisma.post.update({
    where: {
      id: postId,
    },
    data: {
      isDeleted: false,
    },
  });
};

export const getDeletedPostsService = async () => {
  return prisma.post.findMany({
    where: {
      isDeleted: true,
    },

    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};