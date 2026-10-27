import { z } from "zod";

const limitQuery = z.string().regex(/^\d+$/, "limit must be a number").optional();

export const recommendationListSchema = z.object({
  query: z.object({
    limit: limitQuery,
  }),
});

export const bestSellersSchema = z.object({
  query: z.object({
    limit: limitQuery,
    // Category slug - only best sellers in that category.
    category: z.string().min(1).optional(),
  }),
});

export const recordViewSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
  }),
});
