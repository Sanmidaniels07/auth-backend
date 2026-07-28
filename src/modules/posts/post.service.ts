import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

export const createPostService = async (
  userId: string,
  data: {
    title: string;
    content: string;
  },
) => {
  return prisma.post.create({
    data: {
      title: data.title,
      content: data.content,
      authorId: userId,
    },
  });
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

    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: { likes: true },
      },
    },

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

  const postsWithLikeInfo = posts.map(({ _count, ...post }) => ({
    ...post,
    likeCount: _count.likes,
    likedByMe: likedPostIds.has(post.id),
  }));

  return {
    posts: postsWithLikeInfo,
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
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: { likes: true },
      },
    },
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

  const { _count, ...rest } = post;

  return {
    ...rest,
    likeCount: _count.likes,
    likedByMe: !!like,
  };
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

  return prisma.post.update({
    where: {
      id: postId,
    },

    data,
  });
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
