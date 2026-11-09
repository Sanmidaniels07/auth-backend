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

export const updateWishlistVisibilitySchema = z.object({
  body: z.object({
    visibility: z.enum(["PRIVATE", "FOLLOWERS", "EVERYONE"], {
      message: "Visibility must be PRIVATE, FOLLOWERS or EVERYONE.",
    }),
  }),
});

export const getUserWishlistSchema = z.object({
  params: z.object({
    identifier: z.string().min(1),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});
