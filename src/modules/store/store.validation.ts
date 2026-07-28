import { z } from "zod";

const storeFields = {
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  logo: z.string().trim().optional(),
  banner: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
};

export const createStoreSchema = z.object({
  body: z.object(storeFields),
});

export const updateStoreSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    ...storeFields,
    name: storeFields.name.optional(),
  }),
});

export const listStoresSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    city: z.string().optional(),
  }),
});

export const storeReviewsSchema = z.object({
  params: z.object({
    slug: z.string(),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const storeProductsSchema = z.object({
  params: z.object({
    slug: z.string(),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>["body"];
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>["body"];
