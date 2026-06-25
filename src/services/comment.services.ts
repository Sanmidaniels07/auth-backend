import prisma from "../prisma/prisma";
import { AppError } from "../utils/appError";

export const createCommentService = async (
  userId: string,
  postId: string,
  content: string
) => {
  return prisma.comment.create({
    data: {
      content,
      userId,
      postId,
    },
  });
};

export const getPostCommentsService =
  async (postId: string) => {
    return prisma.comment.findMany({
      where: {
        postId,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };

export const getCommentByIdService = async (
  commentId: string
) => {
  return prisma.comment.findUnique({
    where: {
      id: commentId,
    },
  });
};

export const updateCommentService = async (
  commentId: string,
  userId: string,
  content: string
) => {
  const comment =
    await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
    });

  if (!comment) {
    throw new AppError(
      "Comment not found",
      404
    );
  }

  if (comment.userId !== userId) {
    throw new AppError(
      "Unauthorized",
      403
    );
  }

  return prisma.comment.update({
    where: {
      id: commentId,
    },

    data: {
      content,
    },
  });
};

export const deleteCommentService = async (
  commentId: string,
  userId: string
) => {
  const comment =
    await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
    });

  if (!comment) {
    throw new AppError(
      "Comment not found",
      404
    );
  }

  if (comment.userId !== userId) {
    throw new AppError(
      "Unauthorized",
      403
    );
  }

  return prisma.comment.delete({
    where: {
      id: commentId,
    },
  });
};