import { z } from "zod";
import { MediaType } from "@prisma/client";

const mediaItemSchema = z.object({
  url: z.string().trim().min(1),
  type: z.nativeEnum(MediaType),
});

export const createConversationSchema = z.object({
  body: z.object({
    userId: z.string(),
  }),
});

export const listConversationsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const conversationIdSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const listMessagesSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z
    .object({
      content: z.string().trim().min(1).max(2000).optional(),
      media: z.array(mediaItemSchema).max(10).optional(),
    })
    .refine(
      (data) => !!data.content || (data.media && data.media.length > 0),
      {
        message:
          "A message needs text content, at least one image or video, or both.",
        path: ["content"],
      }
    ),
});
