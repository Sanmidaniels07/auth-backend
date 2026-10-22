import { MediaType, ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { syncPostHashtags } from "../hashtag/hashtag.service";
import { getBlockedUserIds } from "../block/block.service";

interface MediaInput {
  url: string;
  type: MediaType;
}

const POST_INCLUDE = {
  // Public fields only - GET /posts works without logging in, so never
  // include the author's email here.
  author: {
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
    },
  },
  media: {
    orderBy: { order: "asc" as const },
  },
  hashtags: {
    include: { hashtag: true },
  },
  product: {
    select: {
      id: true,
      title: true,
      price: true,
      status: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      store: { select: { name: true, slug: true, isSuspended: true } },
    },
  },
  _count: {
    select: { likes: true },
  },
};

type TaggedProduct = {
  id: string;
  title: string;
  price: number;
  status: ProductStatus;
  images: { url: string }[];
  store: { name: string; slug: string; isSuspended: boolean };
} | null;

const withPostExtras = <
  T extends {
    _count: { likes: number };
    hashtags: { hashtag: { tag: string } }[];
    product: TaggedProduct;
  }
>(
  post: T,
  likedByMe: boolean
) => {
  const { _count, hashtags, product, ...rest } = post;

  return {
    ...rest,
    likeCount: _count.likes,
    likedByMe,
    hashtags: hashtags.map((ph) => ph.hashtag.tag),
    // A tag only shows while the product can actually be bought.
    product:
      product && product.status === ProductStatus.PUBLISHED && !product.store.isSuspended
        ? {
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.images[0]?.url ?? null,
            store: { name: product.store.name, slug: product.store.slug },
          }
        : null,
  };
};

/** Authors can only tag their own published products. */
const assertTaggableProduct = async (userId: string, productId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { status: true, store: { select: { isSuspended: true, seller: { select: { userId: true } } } } },
  });

  if (!product || product.store.seller.userId !== userId) {
    throw new AppError("You can only tag products from your own store.", 400);
  }
  if (product.status !== ProductStatus.PUBLISHED || product.store.isSuspended) {
    throw new AppError("Only published products can be tagged in a post.", 400);
  }
};

export const createPostService = async (
  userId: string,
  data: {
    title?: string;
    content?: string;
    media?: MediaInput[];
    productId?: string;
  },
) => {
  if (data.productId) {
    await assertTaggableProduct(userId, data.productId);
  }

  const post = await prisma.post.create({
    data: {
      title: data.title,
      content: data.content,
      authorId: userId,
      productId: data.productId,
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

  await syncPostHashtags(post.id, data.content ?? "");

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

  // Only applied to general feed browsing - a specific authorId filter
  // (e.g. viewing one user's profile) is left as-is.
  if (userId && !authorId) {
    const blockedIds = await getBlockedUserIds(userId);
    if (blockedIds.length > 0) {
      where.authorId = { notIn: blockedIds };
    }
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
    /** A product id to tag, null to remove the tag, undefined to leave it. */
    productId?: string | null;
  },
) => {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      isDeleted: false,
    },
    include: { media: true },
  });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  if (post.authorId !== userId) {
    throw new AppError("Unauthorized", 403);
  }

  const finalContent =
    data.content !== undefined ? data.content : post.content;
  const finalMediaCount =
    data.media !== undefined ? data.media.length : post.media.length;

  if (!finalContent && finalMediaCount === 0) {
    throw new AppError(
      "A post needs text content, at least one image or video, or both.",
      400
    );
  }

  if (data.productId) {
    await assertTaggableProduct(userId, data.productId);
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
          username: true,
          avatar: true,
        },
      },
    },
  });
};