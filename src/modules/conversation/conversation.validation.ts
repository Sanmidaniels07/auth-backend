import { z } from "zod";

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
  body: z.object({
    content: z.string().trim().min(1).max(2000),
  }),
});
