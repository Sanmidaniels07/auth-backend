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
      // Quote an earlier message in this chat.
      replyToId: z.string().min(1).optional(),
      // Share a product as a card.
      productId: z.string().min(1).optional(),
    })
    .refine(
      (data) => !!data.content || (data.media && data.media.length > 0) || !!data.productId,
      {
        message:
          "A message needs text, a photo or video, or a product.",
        path: ["content"],
      }
    ),
});

const messageParams = z.object({
  id: z.string(),
  messageId: z.string(),
});

export const reactToMessageSchema = z.object({
  params: messageParams,
  body: z.object({
    // One emoji (some are several characters); null removes your reaction.
    emoji: z.string().trim().min(1).max(16).nullable(),
  }),
});

export const deleteMessageSchema = z.object({
  params: messageParams,
});
