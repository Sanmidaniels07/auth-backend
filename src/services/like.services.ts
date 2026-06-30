import prisma from "../prisma/prisma";
import { AppError } from "../utils/appError";
import { createNotificationService } from "./notification.services";

export const likePostService = async (
  userId: string,
  postId: string
) => {
  const existingLike = await prisma.like.findUnique({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
  });

  if (existingLike) {
    throw new AppError("Already liked", 400);
  }

  // Fetch post and user first
  const [post, user] = await Promise.all([
    prisma.post.findUnique({ where: { id: postId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!post) throw new AppError("Post not found", 404);
  if (!user) throw new AppError("User not found", 404);

  // Create the like first
  const like = await prisma.like.create({
    data: {
      userId,
      postId,
    },
  });

  // Then send notification (only if liker isn't the post author)
  if (post.authorId !== userId) {
    createNotificationService(
      post.authorId,
      "New Like",
      `${user.name} liked your post`
    ).catch((error) => {
      console.error("Notification failed:", error);
    });
  }

  return like;
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