import { z } from "zod";

export const followParamsSchema = z.object({
  params: z.object({
    userId: z.string(),
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