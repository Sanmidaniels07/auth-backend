import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2),
    icon: z.string().trim().optional(),
    isFeatured: z.boolean().optional(),
    commissionRate: z.number().min(0).max(100).optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    name: z.string().trim().min(2).optional(),
    icon: z.string().trim().optional(),
    isFeatured: z.boolean().optional(),
    commissionRate: z.number().min(0).max(100).optional(),
  }),
});

export const deleteCategorySchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>["body"];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>["body"];
