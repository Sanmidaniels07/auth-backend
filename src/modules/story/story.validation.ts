import { z } from "zod";
import { MediaType } from "@prisma/client";

export const createStorySchema = z.object({
  body: z.object({
    mediaUrl: z.string().trim().min(1),
    mediaType: z.nativeEnum(MediaType),
    caption: z.string().trim().max(280).optional(),
  }),
});

export const storyIdSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const storyViewersSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const reactToStorySchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    emoji: z.string().trim().min(1).max(8),
  }),
});
