import { NotificationType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { createNotificationService } from "../notification/notification.service";
import { isBlockedEitherWay } from "../block/block.service";

const USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  bio: true,
};

export const followUserService = async (
  followerId: string,
  followingId: string
) => {
  if (followerId === followingId) {
    throw new AppError("You cannot follow yourself.", 400);
  }

  const [follower, targetUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: followerId } }),
    prisma.user.findUnique({ where: { id: followingId } }),
  ]);

  if (!follower || !targetUser) {
    throw new AppError("User not found.", 404);
  }

  if (await isBlockedEitherWay(followerId, followingId)) {
    throw new AppError(
      "You cannot follow this user.",
      403
    );
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId, followingId },
    },
  });

  if (existing) {
    throw new AppError(
      "You are already following this user.",
      400
    );
  }

  const follow = await prisma.follow.create({
    data: { followerId, followingId },
  });

  createNotificationService(
    followingId,
    "New Follower",
    `${follower.name} started following you`,
    NotificationType.FOLLOW,
    { type: "USER", id: followerId }
  ).catch((error) => {
    console.error("Notification failed:", error);
  });

  return follow;
};

export const unfollowUserService = async (
  followerId: string,
  followingId: string
) => {
  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId, followingId },
    },
  });

  if (!existing) {
    throw new AppError(
      "You are not following this user.",
      404
    );
  }

  await prisma.follow.delete({
    where: { id: existing.id },
  });
};

/**
 * Removes someone from your followers (like Instagram's "Remove"): they stop
 * following you, without you blocking them. They aren't notified and can
 * follow you again later.
 */
export const removeFollowerService = async (
  userId: string,
  followerId: string
) => {
  if (userId === followerId) {
    throw new AppError("You can't remove yourself.", 400);
  }

  const { count } = await prisma.follow.deleteMany({
    where: { followerId, followingId: userId },
  });

  if (count === 0) {
    throw new AppError("This person doesn't follow you.", 404);
  }
};

export const getFollowersService = async (
  userId: string,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        follower: { select: USER_SUMMARY_SELECT },
      },
    }),
    prisma.follow.count({ where: { followingId: userId } }),
  ]);

  return {
    followers: follows.map((follow) => follow.follower),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getFollowingService = async (
  userId: string,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        following: { select: USER_SUMMARY_SELECT },
      },
    }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);

  return {
    following: follows.map((follow) => follow.following),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getFollowStatusService = async (
  currentUserId: string,
  targetUserId: string
) => {
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    },
  });

  return { isFollowing: !!follow };
};