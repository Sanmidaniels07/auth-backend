import { z } from "zod";
import { ProductCondition, ProductStatus } from "@prisma/client";

const imageSchema = z.object({
  url: z.string().trim().min(1),
  isPrimary: z.boolean().optional(),
});

const specificationSchema = z.object({
  name: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

const variantSchema = z.object({
  name: z.string().trim().min(1),
  value: z.string().trim().min(1),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
});

export const createProductSchema = z.object({
  body: z.object({
    categoryId: z.string(),
    title: z.string().trim().min(2),
    description: z.string().trim().min(1),
    sku: z.string().trim().min(1),
    brand: z.string().trim().optional(),
    condition: z.nativeEnum(ProductCondition).optional(),
    price: z.number().positive(),
    originalPrice: z.number().positive().optional(),
    stock: z.number().int().min(0),
    isFeatured: z.boolean().optional(),
    highlights: z.array(z.string().trim().min(1)).max(10).optional(),
    images: z.array(imageSchema).optional(),
    specifications: z.array(specificationSchema).optional(),
    variants: z.array(variantSchema).optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    categoryId: z.string().optional(),
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().min(1).optional(),
    sku: z.string().trim().min(1).optional(),
    brand: z.string().trim().optional(),
    condition: z.nativeEnum(ProductCondition).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    price: z.number().positive().optional(),
    originalPrice: z.number().positive().optional(),
    stock: z.number().int().min(0).optional(),
    isFeatured: z.boolean().optional(),
    highlights: z.array(z.string().trim().min(1)).max(10).optional(),
    images: z.array(imageSchema).optional(),
    specifications: z.array(specificationSchema).optional(),
    variants: z.array(variantSchema).optional(),
  }),
});

export const listProductsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    category: z.string().optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    condition: z.nativeEnum(ProductCondition).optional(),
    brand: z.string().optional(),
    sort: z
      .enum(["newest", "oldest", "price_asc", "price_desc"])
      .optional(),
  }),
});

export const nearbyProductsSchema = z.object({
  query: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const relatedProductsSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  query: z.object({
    limit: z.string().optional(),
  }),
});

export const productReviewsSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const sellerProductsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(ProductStatus).optional(),
  }),
});

export type CreateProductInput = z.infer<
  typeof createProductSchema
>["body"];

export type UpdateProductInput = z.infer<
  typeof updateProductSchema
>["body"];
