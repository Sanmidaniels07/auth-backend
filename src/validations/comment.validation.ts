import { z } from "zod";

export const createCommentSchema = z.object({
  params: z.object({
    postId: z.string(),
  }),

  body: z.object({
    content: z.string().min(1),
  }),
});