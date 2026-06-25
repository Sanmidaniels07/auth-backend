import { z } from "zod";

export const createCommentSchema = z.object({
  params: z.object({
    postId: z.string(),
  }),

  body: z.object({
    content: z.string().min(1),
  }),
});

export const updateCommentSchema =
  z.object({
    content: z
      .string()
      .min(1, "Comment required"),
  });

export const deleteCommentSchema = z.object({
  params: z.object({
    commentId: z.string(),
  }),
});