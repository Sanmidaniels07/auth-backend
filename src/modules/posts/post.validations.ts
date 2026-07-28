import { z } from "zod";
import { MediaType } from "@prisma/client";

const mediaItemSchema = z.object({
  url: z.string().trim().min(1),
  type: z.nativeEnum(MediaType),
});

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    media: z.array(mediaItemSchema).max(10).optional(),
  }),
});

export const updatePostSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    media: z.array(mediaItemSchema).max(10).optional(),
  }),
});