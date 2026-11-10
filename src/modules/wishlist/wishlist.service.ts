import { ProductStatus, WishlistVisibility } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { isBlockedEitherWay } from "../block/block.service";

const WISHLIST_PRODUCT_INCLUDE = {
  product: {
    include: {
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      store: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
} as const;

export const addToWishlistService = async (
  userId: string,
  productId: string
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_productId: { userId, productId },
    },
  });

  if (existing) {
    throw new AppError(
      "Product already in wishlist.",
      400
    );
  }

  return prisma.wishlist.create({
    data: { userId, productId },
  });
};

export const getWishlistService = async (
  userId: string,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  const [items, total, owner] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: WISHLIST_PRODUCT_INCLUDE,
    }),
    prisma.wishlist.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { wishlistVisibility: true } }),
  ]);

  return {
    visibility: owner?.wishlistVisibility ?? WishlistVisibility.PRIVATE,
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const removeFromWishlistService = async (
  userId: string,
  productId: string
) => {
  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_productId: { userId, productId },
    },
  });

  if (!existing) {
    throw new AppError(
      "Product not found in wishlist.",
      404
    );
  }

  await prisma.wishlist.delete({
    where: {
      userId_productId: { userId, productId },
    },
  });
};

/** Who can see a person's wishlist: themselves, or the audience they chose. */
export const canViewWishlist = async (
  owner: { id: string; wishlistVisibility: WishlistVisibility },
  viewerId?: string
): Promise<boolean> => {
  if (viewerId === owner.id) return true;
  if (owner.wishlistVisibility === WishlistVisibility.PRIVATE) return false;
  if (viewerId && (await isBlockedEitherWay(owner.id, viewerId))) return false;
  if (owner.wishlistVisibility === WishlistVisibility.EVERYONE) return true;

  if (!viewerId) return false;
  const follow = await prisma.follow.findFirst({
    where: { followerId: viewerId, followingId: owner.id },
    select: { id: true },
  });
  return !!follow;
};

export const updateWishlistVisibilityService = async (
  userId: string,
  visibility: WishlistVisibility
) =>
  prisma.user.update({
    where: { id: userId },
    data: { wishlistVisibility: visibility },
    select: { wishlistVisibility: true },
  });

/**
 * Someone else's wishlist, for gift ideas. Other people only see items
 * that can still be bought from an active store.
 */
export const getUserWishlistService = async (
  identifier: string,
  viewerId: string | undefined,
  page: number,
  limit: number
) => {
  const owner = await prisma.user.findFirst({
    where: { OR: [{ id: identifier }, { username: identifier }], deletedAt: null },
    select: { id: true, name: true, username: true, wishlistVisibility: true },
  });

  if (!owner) {
    throw new AppError("User not found.", 404);
  }

  if (!(await canViewWishlist(owner, viewerId))) {
    throw new AppError(
      owner.wishlistVisibility === WishlistVisibility.FOLLOWERS
        ? `Follow ${owner.name} to see their wishlist.`
        : "This wishlist is private.",
      403
    );
  }

  const isOwner = viewerId === owner.id;
  const where = {
    userId: owner.id,
    ...(isOwner
      ? {}
      : {
          product: {
            status: { in: [ProductStatus.PUBLISHED, ProductStatus.OUT_OF_STOCK] },
            store: { isSuspended: false },
          },
        }),
  };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.wishlist.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: WISHLIST_PRODUCT_INCLUDE,
    }),
    prisma.wishlist.count({ where }),
  ]);

  return {
    owner: { id: owner.id, name: owner.name, username: owner.username },
    visibility: owner.wishlistVisibility,
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
