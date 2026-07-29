import { z } from "zod";
import { CommunityRole } from "@prisma/client";

export const createCommunitySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2),
    description: z.string().trim().optional(),
    icon: z.string().trim().optional(),
  }),
});

export const listCommunitiesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const trendingCommunitiesSchema = z.object({
  query: z.object({
    limit: z.string().optional(),
  }),
});

export const communitySlugSchema = z.object({
  params: z.object({
    slug: z.string(),
  }),
});

export const updateMemberRoleSchema = z.object({
  params: z.object({
    slug: z.string(),
    userId: z.string(),
  }),
  body: z.object({
    role: z.nativeEnum(CommunityRole),
  }),
});

export const removeMemberSchema = z.object({
  params: z.object({
    slug: z.string(),
    userId: z.string(),
  }),
});