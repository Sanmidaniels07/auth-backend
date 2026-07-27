import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

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

  const [items, total] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
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
      },
    }),
    prisma.wishlist.count({ where: { userId } }),
  ]);

  return {
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
