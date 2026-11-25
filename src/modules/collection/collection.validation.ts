import { z } from "zod";

// A collection: a name, an optional line about it, and 1-50 of the store's
// products in the order buyers see them.
export const MAX_COLLECTION_PRODUCTS = 50;

const fields = {
  name: z.string().trim().min(2, "Give the collection a name.").max(80),
  description: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null)),
  productIds: z
    .array(z.string().min(1))
    .min(1, "Pick at least one product.")
    .max(MAX_COLLECTION_PRODUCTS, `A collection can have up to ${MAX_COLLECTION_PRODUCTS} products.`),
};

export const createCollectionSchema = z.object({
  body: z.object(fields),
});

export const updateCollectionSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: fields.name.optional(),
    description: fields.description,
    productIds: fields.productIds.optional(),
    isActive: z.boolean().optional(),
  }),
});

export const collectionIdSchema = z.object({
  params: z.object({ id: z.string() }),
});

export const publicCollectionSchema = z.object({
  params: z.object({ store: z.string(), slug: z.string() }),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>["body"];
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>["body"];
