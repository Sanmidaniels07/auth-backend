import { z } from "zod";

export const createReviewSchema = z.object({
  body: z.object({
    productId: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().optional(),
  }),
});

export const updateReviewSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().optional(),
  }),
});

export const deleteReviewSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const replyToReviewSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    reply: z.string().trim().min(1),
  }),
});

export type UpdateReviewInput = z.infer<
  typeof updateReviewSchema
>["body"];
