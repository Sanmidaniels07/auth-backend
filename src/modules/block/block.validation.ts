import { z } from "zod";

export const blockUserSchema = z.object({
  params: z.object({
    userId: z.string(),
  }),
});

export const listBlockedSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});
