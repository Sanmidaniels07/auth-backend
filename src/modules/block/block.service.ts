import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

export const blockUserService = async (
  blockerId: string,
  blockedId: string
) => {
  if (blockerId === blockedId) {
    throw new AppError("You cannot block yourself.", 400);
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: blockedId },
  });

  if (!targetUser) {
    throw new AppError("User not found.", 404);
  }

  const existing = await prisma.block.findUnique({
    where: {
      blockerId_blockedId: { blockerId, blockedId },
    },
  });

  if (existing) {
    throw new AppError(
      "You have already blocked this user.",
      400
    );
  }

  await prisma.$transaction([
    prisma.block.create({
      data: { blockerId, blockedId },
    }),
    // Blocking implies unfollowing each other.
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    }),
  ]);

  return { message: "User blocked successfully." };
};

export const unblockUserService = async (
  blockerId: string,
  blockedId: string
) => {
  const existing = await prisma.block.findUnique({
    where: {
      blockerId_blockedId: { blockerId, blockedId },
    },
  });

  if (!existing) {
    throw new AppError(
      "You have not blocked this user.",
      404
    );
  }

  await prisma.block.delete({
    where: { id: existing.id },
  });
};

export const getBlockedUsersService = async (
  blockerId: string,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  const [blocks, total] = await Promise.all([
    prisma.block.findMany({
      where: { blockerId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.block.count({ where: { blockerId } }),
  ]);

  return {
    blockedUsers: blocks.map((block) => block.blocked),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const isBlockedEitherWay = async (
  userIdA: string,
  userIdB: string
): Promise<boolean> => {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
  });

  return !!block;
};

export const getBlockedUserIds = async (
  userId: string
): Promise<string[]> => {
  const blocks = await prisma.block.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    },
    select: { blockerId: true, blockedId: true },
  });

  const ids = new Set<string>();
  for (const block of blocks) {
    ids.add(block.blockerId === userId ? block.blockedId : block.blockerId);
  }

  return Array.from(ids);
};
