import { z } from "zod";

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string(),
    // Required for products with options - the chosen combination.
    variationId: z.string().optional(),
    quantity: z.number().int().min(1).optional(),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({
    productId: z.string(),
  }),
  body: z.object({
    quantity: z.number().int().min(1),
  }),
});

export const removeCartItemSchema = z.object({
  params: z.object({
    productId: z.string(),
  }),
});
