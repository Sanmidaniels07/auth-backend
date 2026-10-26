import { z } from "zod";
import { DeliveryVehicle, ShippingOptionType } from "@prisma/client";

const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

// "@ray.cakes", "ray.cakes" or "https://www.instagram.com/ray.cakes/?hl=en" -> "ray.cakes"
const handleFrom = (value: string) => {
  const trimmed = value.trim();
  const fromUrl = trimmed.match(/^(?:https?:\/\/)?(?:www\.|m\.)?[a-z]+\.(?:com|net)\/@?([^/?#]+)/i);
  return (fromUrl ? fromUrl[1] : trimmed).replace(/^@/, "");
};

const socialHandle = (label: string, pattern: RegExp) =>
  z.preprocess(
    (value) => (typeof value === "string" ? (value.trim() ? handleFrom(value) : null) : value),
    z.string().regex(pattern, `That doesn't look like a valid ${label} username.`).nullable().optional()
  );

// "0815 967 1809", "+234 815 967 1809", "wa.me/2348159671809" -> "2348159671809"
const whatsappNumber = z.preprocess(
  (value) => {
    if (typeof value !== "string" || !value.trim()) return blankToNull(value);
    const digits = value.replace(/\D/g, "");
    return digits.startsWith("0") && digits.length === 11 ? `234${digits.slice(1)}` : digits;
  },
  z.string().regex(/^\d{10,15}$/, "Enter your WhatsApp number, e.g. 0815 967 1809.").nullable().optional()
);

const socialFields = {
  instagram: socialHandle("Instagram", /^[A-Za-z0-9._]{1,30}$/),
  facebook: socialHandle("Facebook", /^[A-Za-z0-9.\-]{2,80}$/),
  tiktok: socialHandle("TikTok", /^[A-Za-z0-9._]{2,24}$/),
  whatsapp: whatsappNumber,
};

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
  returnPolicy: z.string().trim().optional(),
  shippingPolicy: z.string().trim().optional(),
  warrantyPolicy: z.string().trim().optional(),
  ...socialFields,
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
    // "trending" ranks stores with live products by views, then followers.
    sort: z.enum(["newest", "trending"]).optional(),
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

export const storeSlugSchema = z.object({
  params: z.object({
    slug: z.string(),
  }),
});

// A delivery zone: a price for a group of areas. Either a name or at least
// one area is required (the name defaults to the areas joined).
export const MAX_ZONE_AREAS = 40;
export const MAX_ZONES_PER_REQUEST = 50;

const zoneFields = {
  name: z.string().trim().min(1).max(200).optional(),
  fee: z.number().min(0).max(10_000_000),
  eta: z.string().trim().min(1).max(50).optional(),
  areas: z.array(z.string().trim().min(1).max(80)).max(MAX_ZONE_AREAS).optional(),
  state: z.string().trim().min(2).max(60).optional(),
  // PICKUP options are always free and cover no areas (enforced in the service).
  type: z.nativeEnum(ShippingOptionType).optional(),
  pickupAddress: z.string().trim().min(3).max(300).optional(),
  // Delivery only: dispatch bike, car or truck. Ignored for pickup.
  vehicle: z.nativeEnum(DeliveryVehicle).optional(),
};

const hasNameOrAreas = (zone: { name?: string; areas?: string[]; type?: ShippingOptionType }) =>
  zone.type === ShippingOptionType.PICKUP || !!zone.name || !!zone.areas?.length;
const NAME_OR_AREAS = { message: "Give the zone a name or pick at least one area.", path: ["name"] };

const zoneBody = z.object(zoneFields).refine(hasNameOrAreas, NAME_OR_AREAS);

export const createShippingOptionSchema = z.object({
  params: z.object({
    slug: z.string(),
  }),
  body: zoneBody,
});

export const bulkCreateShippingOptionsSchema = z.object({
  params: z.object({
    slug: z.string(),
  }),
  body: z.object({
    options: z.array(zoneBody).min(1).max(MAX_ZONES_PER_REQUEST),
  }),
});

export const updateShippingOptionSchema = z.object({
  params: z.object({
    slug: z.string(),
    optionId: z.string(),
  }),
  body: z.object({
    ...zoneFields,
    fee: zoneFields.fee.optional(),
    // null clears the delivery time.
    eta: z.string().trim().min(1).max(50).nullable().optional(),
    // null falls back to the store's address.
    pickupAddress: z.string().trim().min(3).max(300).nullable().optional(),
    // null clears it (zone offered for every product).
    vehicle: z.nativeEnum(DeliveryVehicle).nullable().optional(),
    isArchived: z.boolean().optional(),
  }),
});

export const deleteShippingOptionSchema = z.object({
  params: z.object({
    slug: z.string(),
    optionId: z.string(),
  }),
});

export const setupPayoutAccountSchema = z.object({
  params: z.object({
    slug: z.string(),
  }),
  body: z.object({
    bankCode: z.string().trim().min(1),
    accountNumber: z.string().trim().min(10).max(10),
  }),
});

export const adminVerifyStoreSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    isVerified: z.boolean(),
  }),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>["body"];
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>["body"];
