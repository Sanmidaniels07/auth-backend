import { z } from "zod";

export const quickSearchSchema = z.object({
  query: z.object({
    q: z.string().trim().min(1),
  }),
});

export const searchByTypeSchema = z.object({
  params: z.object({
    type: z.enum(["users", "posts", "communities", "hashtags"]),
  }),
  query: z.object({
    q: z.string().trim().min(1),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});
