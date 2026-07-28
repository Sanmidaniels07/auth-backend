import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { UpdateProfileInput } from "./profile.validation";

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
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
  dateOfBirth: true,
  skills: true,
  interests: true,
  languages: true,
  role: true,
  isVerified: true,
  createdAt: true,
};

const SIMPLE_COMPLETION_FIELDS = [
  "username",
  "avatar",
  "cover",
  "bio",
  "location",
  "website",
  "occupation",
  "company",
  "education",
  "dateOfBirth",
] as const;

const ARRAY_COMPLETION_FIELDS = [
  "skills",
  "interests",
  "languages",
] as const;

const hasAnySocialLink = (socialLinks: unknown): boolean => {
  if (!socialLinks || typeof socialLinks !== "object") {
    return false;
  }

  return Object.values(
    socialLinks as Record<string, unknown>
  ).some((value) => !!value);
};

const withProfileCompletion = <
  T extends Record<string, unknown>
>(
  user: T
) => {
  const simpleFilledCount = SIMPLE_COMPLETION_FIELDS.filter(
    (field) => !!user[field]
  ).length;

  const arrayFilledCount = ARRAY_COMPLETION_FIELDS.filter(
    (field) => Array.isArray(user[field]) && (user[field] as unknown[]).length > 0
  ).length;

  const socialLinksFilled = hasAnySocialLink(
    user.socialLinks
  )
    ? 1
    : 0;

  const totalFields =
    SIMPLE_COMPLETION_FIELDS.length +
    ARRAY_COMPLETION_FIELDS.length +
    1;

  const filledCount =
    simpleFilledCount + arrayFilledCount + socialLinksFilled;

  return {
    ...user,
    profileCompletion: Math.round(
      (filledCount / totalFields) * 100
    ),
  };
};

export const getProfileService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT,
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return withProfileCompletion(user);
};

export const updateProfileService = async (
  userId: string,
  data: UpdateProfileInput
) => {
  if (data.username) {
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing && existing.id !== userId) {
      throw new AppError("Username already taken.", 400);
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: PROFILE_SELECT,
  });

  return withProfileCompletion(user);
};