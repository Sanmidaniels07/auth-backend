import { CommunityRole } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { generateUniqueSlug } from "../../utils/slugify";

interface CreateCommunityInput {
  name: string;
  description?: string;
  icon?: string;
}

export const createCommunityService = async (
  userId: string,
  data: CreateCommunityInput
) => {
  const slug = await generateUniqueSlug(
    data.name,
    async (candidate) => {
      const found = await prisma.community.findUnique({
        where: { slug: candidate },
      });
      return !!found;
    }
  );

  return prisma.$transaction(async (tx) => {
    const community = await tx.community.create({
      data: { ...data, slug, creatorId: userId },
    });

    await tx.communityMember.create({
      data: {
        communityId: community.id,
        userId,
        role: CommunityRole.ADMIN,
      },
    });

    return community;
  });
};

export const listCommunitiesService = async (
  page: number,
  limit: number,
  search?: string
) => {
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const [communities, total] = await Promise.all([
    prisma.community.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.community.count({ where }),
  ]);

  return {
    communities: communities.map(({ _count, ...community }) => ({
      ...community,
      memberCount: _count.members,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getMyCommunitiesService = async (
  userId: string,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  const where = { members: { some: { userId } } };

  const [communities, total] = await Promise.all([
    prisma.community.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.community.count({ where }),
  ]);

  return {
    communities: communities.map(({ _count, ...community }) => ({
      ...community,
      memberCount: _count.members,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getTrendingCommunitiesService = async (
  limit: number
) => {
  const communities = await prisma.community.findMany({
    take: limit,
    include: {
      _count: { select: { members: true } },
    },
    orderBy: {
      members: { _count: "desc" },
    },
  });

  return communities.map(({ _count, ...community }) => ({
    ...community,
    memberCount: _count.members,
  }));
};

export const getCommunityBySlugService = async (
  slug: string,
  userId?: string
) => {
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      _count: { select: { members: true } },
    },
  });

  if (!community) {
    throw new AppError("Community not found.", 404);
  }

  let isMember = false;

  if (userId) {
    const membership = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId: community.id,
          userId,
        },
      },
    });
    isMember = !!membership;
  }

  const { _count, ...rest } = community;

  return {
    ...rest,
    memberCount: _count.members,
    isMember,
  };
};

export const joinCommunityService = async (
  slug: string,
  userId: string
) => {
  const community = await prisma.community.findUnique({
    where: { slug },
  });

  if (!community) {
    throw new AppError("Community not found.", 404);
  }

  const existing = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId,
      },
    },
  });

  if (existing) {
    throw new AppError(
      "You are already a member of this community.",
      400
    );
  }

  return prisma.communityMember.create({
    data: {
      communityId: community.id,
      userId,
      role: CommunityRole.MEMBER,
    },
  });
};

export const leaveCommunityService = async (
  slug: string,
  userId: string
) => {
  const community = await prisma.community.findUnique({
    where: { slug },
  });

  if (!community) {
    throw new AppError("Community not found.", 404);
  }

  const existing = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId,
      },
    },
  });

  if (!existing) {
    throw new AppError(
      "You are not a member of this community.",
      404
    );
  }

  await prisma.communityMember.delete({
    where: { id: existing.id },
  });
};