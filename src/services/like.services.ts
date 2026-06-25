import prisma from "../prisma/prisma";
import { AppError } from "../utils/appError";

export const likePostService = async (
  userId: string,
  postId: string
) => {
  const existingLike =
    await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

  if (existingLike) {
    throw new AppError(
      "Already liked",
      400
    );
  }

  return prisma.like.create({
    data: {
      userId,
      postId,
    },
  });
};

export const unlikePostService = async (
  userId: string,
  postId: string
) => {
  const like =
    await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

  if (!like) {
    throw new AppError(
      "Like not found",
      404
    );
  }

  await prisma.like.delete({
    where: {
      id: like.id,
    },
  });

  return null;
};

export const getPostLikesService =
  async (postId: string) => {
    const count =
      await prisma.like.count({
        where: {
          postId,
        },
      });

    return {
      totalLikes: count,
    };
  };