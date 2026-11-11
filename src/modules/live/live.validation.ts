import { z } from "zod";

import { trafficSourceField } from "../../utils/trafficSource";

export const LIVE_MAX_PRODUCTS = 20;
export const LIVE_TITLE_MAX = 80;
export const LIVE_DESCRIPTION_MAX = 500;
export const LIVE_CHAT_MAX = 200;
export const LIVE_NOTE_MAX = 500;
export const LIVE_SCHEDULE_MAX_DAYS = 30;

const productSchema = z.object({
  productId: z.string().min(1),
  // Live-only discount, percent off. Empty = full price.
  discountPercent: z.number().int().min(5, "A live discount starts at 5%.").max(80, "A live discount can be at most 80%.").optional().nullable(),
});

const liveFields = {
  title: z.string().trim().min(3, "Give your live a title.").max(LIVE_TITLE_MAX),
  description: z.string().trim().max(LIVE_DESCRIPTION_MAX).optional().nullable(),
  coverImage: z.string().trim().url("Upload a cover photo again.").max(1000).optional().nullable(),
  // ISO date-time. Omit (or a time in the past few minutes) to go live now.
  scheduledAt: z.coerce.date(),
  products: z
    .array(productSchema)
    .min(1, "Feature at least one product.")
    .max(LIVE_MAX_PRODUCTS, `Feature up to ${LIVE_MAX_PRODUCTS} products.`)
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, "Each product can only be featured once."),
};

export const createLiveSchema = z.object({
  body: z.object(liveFields),
});

export const updateLiveSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      title: liveFields.title.optional(),
      description: liveFields.description,
      coverImage: liveFields.coverImage,
      scheduledAt: liveFields.scheduledAt.optional(),
      products: liveFields.products.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update." }),
});

export const liveIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const liveCodeSchema = z.object({
  params: z.object({ code: z.string().trim().min(4).max(20) }),
});

export const listLivesSchema = z.object({
  query: z.object({
    // Only this store's lives (store page).
    store: z.string().trim().min(1).max(120).optional(),
  }),
});

export const pinProductSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  // null unpins.
  body: z.object({ productId: z.string().min(1).nullable() }),
});

export const removeMessageSchema = z.object({
  params: z.object({ id: z.string().min(1), messageId: z.string().min(1) }),
});

export const banViewerSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ userId: z.string().min(1) }),
});

export const buyFromLiveSchema = z.object({
  params: z.object({ code: z.string().trim().min(4).max(20) }),
  body: z.object({
    productId: z.string().min(1),
    // Required when the product has options (size, colour...).
    variationId: z.string().min(1).optional(),
    quantity: z.number().int().min(1).max(20).optional(),
    addressId: z.string().min(1),
    // One of the store's delivery zones or pickup points.
    shippingOptionId: z.string().min(1),
    // Phone the seller calls to deliver (defaults to the address's phone).
    deliveryPhone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number for delivery, e.g. 0803 123 4567.")
      .optional(),
    note: z.string().trim().max(LIVE_NOTE_MAX).optional(),
    source: trafficSourceField,
  }),
});

export type CreateLiveInput = z.infer<typeof createLiveSchema>["body"];
export type UpdateLiveInput = z.infer<typeof updateLiveSchema>["body"];
export type BuyFromLiveInput = z.infer<typeof buyFromLiveSchema>["body"];
