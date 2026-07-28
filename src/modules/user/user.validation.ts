import { z } from "zod";

export const listUsersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const suggestedUsersSchema = z.object({
  query: z.object({
    limit: z.string().optional(),
  }),
});

export const getUserProfileSchema = z.object({
  params: z.object({
    identifier: z.string(),
  }),
});