import { z } from "zod";

export const addToWishlistSchema = z.object({
  body: z.object({
    productId: z.string(),
  }),
});

export const removeFromWishlistSchema = z.object({
  params: z.object({
    productId: z.string(),
  }),
});

export const getWishlistSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});
