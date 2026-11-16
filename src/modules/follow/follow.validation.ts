import { z } from "zod";

export const followParamsSchema = z.object({
  params: z.object({
    userId: z.string(),
  }),
});

// DELETE /follow/followers/:userId - the follower to remove from your followers.
export const removeFollowerSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
});

export const listFollowSchema = z.object({
  params: z.object({
    userId: z.string(),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});