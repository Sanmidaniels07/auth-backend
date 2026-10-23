import { z } from "zod";
import { DeliveryVehicle, ProductCondition, ProductStatus } from "@prisma/client";

const imageSchema = z.object({
  url: z.string().trim().min(1),
  isPrimary: z.boolean().optional(),
});

const specificationSchema = z.object({
  name: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

// Up to two options (e.g. Size, Colour) and one variation per combination.
// Products without options leave both out. Sent together - they replace
// the product's existing options and variations.
const optionSchema = z.object({
  name: z.string().trim().min(1).max(30),
  values: z.array(z.string().trim().min(1).max(40)).min(1).max(30),
});

const variationSchema = z.object({
  option1: z.string().trim().min(1),
  option2: z.string().trim().optional(),
  price: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

const optionFields = {
  options: z.array(optionSchema).max(2, "A product can have at most 2 options.").optional(),
  variations: z.array(variationSchema).max(300).optional(),
};

const optionsTogether = (body: { options?: unknown; variations?: unknown }) =>
  (body.options === undefined) === (body.variations === undefined);
const OPTIONS_TOGETHER = { message: "Send options and variations together." };

export const createProductSchema = z.object({
  body: z.object({
    categoryId: z.string(),
    title: z.string().trim().min(2),
    description: z.string().trim().min(1),
    sku: z.string().trim().min(1),
    brand: z.string().trim().optional(),
    condition: z.nativeEnum(ProductCondition).optional(),
    // Smallest vehicle that can deliver it (default BIKE).
    deliveryVehicle: z.nativeEnum(DeliveryVehicle).optional(),
    price: z.number().positive(),
    originalPrice: z.number().positive().optional(),
    stock: z.number().int().min(0),
    isFeatured: z.boolean().optional(),
    highlights: z.array(z.string().trim().min(1)).max(10).optional(),
    images: z.array(imageSchema).optional(),
    specifications: z.array(specificationSchema).optional(),
    ...optionFields,
  }).refine(optionsTogether, OPTIONS_TOGETHER),
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
    deliveryVehicle: z.nativeEnum(DeliveryVehicle).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    price: z.number().positive().optional(),
    originalPrice: z.number().positive().optional(),
    stock: z.number().int().min(0).optional(),
    isFeatured: z.boolean().optional(),
    highlights: z.array(z.string().trim().min(1)).max(10).optional(),
    images: z.array(imageSchema).optional(),
    specifications: z.array(specificationSchema).optional(),
    ...optionFields,
  }).refine(optionsTogether, OPTIONS_TOGETHER),
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
    // Store's state, e.g. "Lagos" or "Abuja" (any common spelling).
    state: z.string().trim().max(60).optional(),
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

export const bulkUpdateProductStatusSchema = z.object({
  body: z.object({
    productIds: z.array(z.string()).min(1),
    status: z.nativeEnum(ProductStatus),
  }),
});

export const bulkDeleteProductsSchema = z.object({
  body: z.object({
    productIds: z.array(z.string()).min(1),
  }),
});

export type CreateProductInput = z.infer<
  typeof createProductSchema
>["body"];

export type UpdateProductInput = z.infer<
  typeof updateProductSchema
>["body"];
