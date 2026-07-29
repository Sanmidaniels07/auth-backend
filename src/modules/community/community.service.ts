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

const requireAdminMember = async (
  communityId: string,
  userId: string
) => {
  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: { communityId, userId },
    },
  });

  if (!membership || membership.role !== CommunityRole.ADMIN) {
    throw new AppError(
      "You must be a community admin to do this.",
      403
    );
  }
};

export const updateMemberRoleService = async (
  actingUserId: string,
  slug: string,
  targetUserId: string,
  role: CommunityRole
) => {
  const community = await prisma.community.findUnique({
    where: { slug },
  });

  if (!community) {
    throw new AppError("Community not found.", 404);
  }

  await requireAdminMember(community.id, actingUserId);

  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId: targetUserId,
      },
    },
  });

  if (!membership) {
    throw new AppError(
      "This user is not a member of the community.",
      404
    );
  }

  return prisma.communityMember.update({
    where: { id: membership.id },
    data: { role },
  });
};

export const removeMemberService = async (
  actingUserId: string,
  slug: string,
  targetUserId: string
) => {
  const community = await prisma.community.findUnique({
    where: { slug },
  });

  if (!community) {
    throw new AppError("Community not found.", 404);
  }

  if (targetUserId === community.creatorId) {
    throw new AppError(
      "The community creator cannot be removed.",
      400
    );
  }

  await requireAdminMember(community.id, actingUserId);

  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId: targetUserId,
      },
    },
  });

  if (!membership) {
    throw new AppError(
      "This user is not a member of the community.",
      404
    );
  }

  await prisma.communityMember.delete({
    where: { id: membership.id },
  });
};

export const deleteCommunityService = async (
  userId: string,
  slug: string
) => {
  const community = await prisma.community.findUnique({
    where: { slug },
  });

  if (!community) {
    throw new AppError("Community not found.", 404);
  }

  if (community.creatorId !== userId) {
    throw new AppError(
      "Only the community creator can delete it.",
      403
    );
  }

  await prisma.community.delete({
    where: { id: community.id },
  });
};