import { createNotificationService } from './notification.services';
import prisma from "../prisma/prisma";
import { AppError } from "../utils/appError";

export const createCommentService = async (
  userId: string,
  postId: string,
  content: string
) => {
  // Fetch post and user first to get authorId and name
  const [post, user] = await Promise.all([
    prisma.post.findUnique({ where: { id: postId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!post) throw new AppError("Post not found", 404);
  if (!user) throw new AppError("User not found", 404);

  // Create the comment first
  const comment = await prisma.comment.create({
    data: {
      content,
      userId,
      postId,
    },
  });

  if (post.authorId !== userId) {
    await createNotificationService(
      post.authorId,
      "New Comment",
      `${user.name} commented on your post`
    ).catch((error) => {
      console.error("Notification failed:", error);
    });
  }

  return comment;
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