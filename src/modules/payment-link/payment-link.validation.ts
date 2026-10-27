import { z } from "zod";
import { PaymentLinkDelivery } from "@prisma/client";

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
  // Agreed with the buyer; 0 = free. Ignored for pickup.
  deliveryFee: z.number().min(0).max(1_000_000).optional(),
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
    // Phone the seller calls to deliver (defaults to the address's phone).
    deliveryPhone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number for delivery, e.g. 0803 123 4567.")
      .optional(),
    note: z.string().trim().max(PAYMENT_LINK_NOTE_MAX).optional(),
  }),
});

export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>["body"];
export type UpdatePaymentLinkInput = z.infer<typeof updatePaymentLinkSchema>["body"];
export type PayPaymentLinkInput = z.infer<typeof payPaymentLinkSchema>["body"];
