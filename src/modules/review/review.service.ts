import { OrderItemStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { UpdateReviewInput } from "./review.validation";

const recomputeStoreRating = async (storeId: string) => {
  const result = await prisma.review.aggregate({
    where: { storeId },
    _avg: { rating: true },
  });

  await prisma.store.update({
    where: { id: storeId },
    data: { rating: result._avg.rating ?? 0 },
  });
};

export const createReviewService = async (
  userId: string,
  productId: string,
  rating: number,
  comment?: string
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  const existing = await prisma.review.findUnique({
    where: {
      userId_productId: { userId, productId },
    },
  });

  if (existing) {
    throw new AppError(
      "You have already reviewed this product.",
      400
    );
  }

  // Only customers who actually received the product can review it.
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      productId,
      status: OrderItemStatus.DELIVERED,
      order: { userId },
    },
  });

  if (!hasPurchased) {
    throw new AppError(
      "You can only review products you have purchased and received.",
      403
    );
  }

  const review = await prisma.review.create({
    data: {
      userId,
      productId,
      storeId: product.storeId,
      rating,
      comment,
    },
  });

  await recomputeStoreRating(product.storeId);

  return review;
};

export const updateReviewService = async (
  userId: string,
  reviewId: string,
  data: UpdateReviewInput
) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new AppError("Review not found.", 404);
  }

  if (review.userId !== userId) {
    throw new AppError(
      "You are not authorized to update this review.",
      403
    );
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data,
  });

  await recomputeStoreRating(review.storeId);

  return updated;
};

export const deleteReviewService = async (
  userId: string,
  reviewId: string
) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new AppError("Review not found.", 404);
  }

  if (review.userId !== userId) {
    throw new AppError(
      "You are not authorized to delete this review.",
      403
    );
  }

  await prisma.review.delete({
    where: { id: reviewId },
  });

  await recomputeStoreRating(review.storeId);
};

export const getProductReviewsService = async (
  productId: string,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  const [reviews, total, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.review.count({ where: { productId } }),
    prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
    }),
  ]);

  return {
    reviews,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    averageRating: aggregate._avg.rating ?? 0,
  };
};

export const getStoreReviewsService = async (
  storeSlug: string,
  page: number,
  limit: number
) => {
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });

  if (!store) {
    throw new AppError("Store not found.", 404);
  }

  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { storeId: store.id },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        product: {
          select: { id: true, title: true, slug: true },
        },
      },
    }),
    prisma.review.count({ where: { storeId: store.id } }),
  ]);

  return {
    reviews,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    averageRating: store.rating,
  };
};
