import { z } from "zod";

export const trendingHashtagsSchema = z.object({
  query: z.object({
    limit: z.string().optional(),
    days: z.string().optional(),
  }),
});

export const postsByHashtagSchema = z.object({
  params: z.object({
    tag: z.string(),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});