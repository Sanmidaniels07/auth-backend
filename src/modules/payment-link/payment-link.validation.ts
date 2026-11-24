import { z } from "zod";
import { DeliveryVehicle, PaymentLinkDelivery } from "@prisma/client";

import { trafficSourceField } from "../../utils/trafficSource";

export const PAYMENT_LINK_MAX_IMAGES = 6;
export const PAYMENT_LINK_NOTE_MAX = 500;

const imageSchema = z.object({
  url: z.string().trim().min(1),
  isPrimary: z.boolean().optional(),
});

const linkFields = {
  title: z.string().trim().min(2, "Give the item a name.").max(120),
  description: z.string().trim().max(2000).optional(),
  price: z.number().positive("Enter a price above ₦0.").max(100_000_000),
  // How many can be bought through the link (1 for a one-off deal).
  quantity: z.number().int().min(0).max(10_000),
  // Sets the commission, like a listed product's category.
  categoryId: z.string().min(1),
  images: z.array(imageSchema).max(PAYMENT_LINK_MAX_IMAGES).optional(),
  deliveryType: z.nativeEnum(PaymentLinkDelivery),
  // Agreed with the buyer; 0 = free. Only for DELIVERY.
  deliveryFee: z.number().min(0).max(1_000_000).optional(),
  // Smallest vehicle that can carry it - limits which of the store's zones
  // the buyer can pick (STORE_OPTIONS). Default bike.
  deliveryVehicle: z.nativeEnum(DeliveryVehicle).optional(),
};

export const createPaymentLinkSchema = z.object({
  body: z.object({
    ...linkFields,
    quantity: linkFields.quantity.min(1).optional(),
  }),
});

export const updatePaymentLinkSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      title: linkFields.title.optional(),
      description: linkFields.description,
      price: linkFields.price.optional(),
      quantity: linkFields.quantity.optional(),
      categoryId: linkFields.categoryId.optional(),
      images: linkFields.images,
      deliveryType: linkFields.deliveryType.optional(),
      deliveryFee: linkFields.deliveryFee,
      deliveryVehicle: linkFields.deliveryVehicle,
      // false pauses the link - buyers see it but can't pay.
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update." }),
});

export const paymentLinkIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const paymentLinkFromProductSchema = z.object({
  params: z.object({
    productId: z.string().min(1),
  }),
});

export const paymentLinkCodeSchema = z.object({
  params: z.object({
    code: z.string().min(1).max(32),
  }),
});

export const payPaymentLinkSchema = z.object({
  params: z.object({
    code: z.string().min(1).max(32),
  }),
  body: z.object({
    quantity: z.number().int().min(1).max(10_000).optional(),
    addressId: z.string().min(1),
    // The store's delivery zone or pickup point - required when the link
    // lets the buyer choose (STORE_OPTIONS).
    shippingOptionId: z.string().min(1).optional(),
    // Shared from the shop with options (e.g. Size, Colour): the combination.
    variationId: z.string().min(1).optional(),
    // Phone the seller calls to deliver (defaults to the address's phone).
    deliveryPhone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number for delivery, e.g. 0803 123 4567.")
      .optional(),
    note: z.string().trim().max(PAYMENT_LINK_NOTE_MAX).optional(),
    source: trafficSourceField,
  }),
});

const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number, e.g. 0803 123 4567.");

// Guest checkout: pay without an account. Who they are and where it goes
// replace the saved address (addressId) a logged-in buyer picks.
export const guestPayPaymentLinkSchema = z.object({
  params: z.object({
    code: z.string().min(1).max(32),
  }),
  body: z.object({
    name: z.string().trim().min(2, "Enter your name.").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
    phone: phoneField,
    // Where to deliver. Not needed for pickup - the buyer collects it.
    address: z.string().trim().min(5, "Enter your street address.").max(300).optional(),
    city: z.string().trim().min(2, "Enter your city or area.").max(80).optional(),
    state: z.string().trim().min(2, "Choose your state.").max(80).optional(),
    quantity: z.number().int().min(1).max(10_000).optional(),
    shippingOptionId: z.string().min(1).optional(),
    // Shared from the shop with options (e.g. Size, Colour): the combination.
    variationId: z.string().min(1).optional(),
    note: z.string().trim().max(PAYMENT_LINK_NOTE_MAX).optional(),
    source: trafficSourceField,
    // The seller's share code from ?ref= - same as at signup.
    referralCode: z.string().trim().max(20).optional(),
  }),
});

const guestTokenParam = z.string().min(20).max(64);

export const guestOrderTokenSchema = z.object({
  params: z.object({ token: guestTokenParam }),
});

export const guestConfirmDeliverySchema = z.object({
  params: z.object({ token: guestTokenParam, orderItemId: z.string().min(1) }),
});

export const guestClaimAccountSchema = z.object({
  params: z.object({ token: guestTokenParam }),
  body: z.object({
    // Same rule as signup.
    password: z.string().min(6, "Use at least 6 characters.").max(128),
  }),
});

export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>["body"];
export type GuestPayPaymentLinkInput = z.infer<typeof guestPayPaymentLinkSchema>["body"];
export type UpdatePaymentLinkInput = z.infer<typeof updatePaymentLinkSchema>["body"];
export type PayPaymentLinkInput = z.infer<typeof payPaymentLinkSchema>["body"];
