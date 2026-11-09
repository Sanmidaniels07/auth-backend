import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { canViewWishlist } from "../wishlist/wishlist.service";

const USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  bio: true,
};

export const listUsersService = async (
  page: number,
  limit: number,
  search?: string,
  excludeUserId?: string
) => {
  const skip = (page - 1) * limit;

  const where: any = {};

  if (excludeUserId) {
    where.id = { not: excludeUserId };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: USER_SUMMARY_SELECT,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getSuggestedUsersService = async (
  userId: string,
  limit: number
) => {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const excludeIds = [
    userId,
    ...following.map((follow) => follow.followingId),
  ];

  const users = await prisma.user.findMany({
    where: { id: { notIn: excludeIds } },
    select: {
      ...USER_SUMMARY_SELECT,
      _count: { select: { followers: true } },
    },
    orderBy: {
      followers: { _count: "desc" },
    },
    take: limit,
  });

  return users.map(({ _count, ...user }) => ({
    ...user,
    followerCount: _count.followers,
  }));
};

export const getUserProfileService = async (
  identifier: string,
  viewerId?: string
) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: identifier }, { username: identifier }],
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      cover: true,
      bio: true,
      location: true,
      website: true,
      socialLinks: true,
      occupation: true,
      company: true,
      education: true,
      // dateOfBirth deliberately omitted: this route is public (optional
      // auth) and the full date reveals a person's age. Owners read it from
      // GET /api/profile; followers only get the day via the dashboard.
      skills: true,
      interests: true,
      languages: true,
      createdAt: true,
      wishlistVisibility: true,
      _count: {
        select: {
          wishlist: true,
          followers: true,
          following: true,
          posts: true,
          profileViewsReceived: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  let profileViews = user._count.profileViewsReceived;

  // Don't count self-views; anonymous viewers are logged with a null viewerId.
  if (viewerId !== user.id) {
    await prisma.profileView.create({
      data: {
        profileUserId: user.id,
        viewerId: viewerId ?? null,
      },
    });
    profileViews += 1;
  }

  const { _count, wishlistVisibility, ...rest } = user;
  // The profile's wishlist tab shows only when this viewer may see it.
  const wishlistVisible = await canViewWishlist({ id: user.id, wishlistVisibility }, viewerId);

  return {
    ...rest,
    wishlist: {
      visibility: wishlistVisibility,
      canView: wishlistVisible,
      count: wishlistVisible ? _count.wishlist : null,
    },
    followersCount: _count.followers,
    followingCount: _count.following,
    postsCount: _count.posts,
    profileViews,
  };
};