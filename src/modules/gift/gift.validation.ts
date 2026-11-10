import { z } from "zod";

import { trafficSourceField } from "../../utils/trafficSource";

export const GIFT_MESSAGE_MAX = 300;

const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number, e.g. 0803 123 4567.");

const codeParams = z.object({ code: z.string().trim().min(4).max(32) });

export const sendGiftSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    // Required when the product is sold in options (size, colour...).
    variationId: z.string().min(1).optional(),
    quantity: z.coerce.number().int().min(1).max(10).optional(),
    // The seller's delivery zone where the recipient lives, or a pickup point.
    shippingOptionId: z.string().min(1, "Choose where the gift is going."),
    // Someone on Nestly (they're told straight away); otherwise share the link.
    recipientId: z.string().min(1).optional(),
    recipientName: z.string().trim().min(1, "Who is the gift for?").max(60),
    message: z.string().trim().max(GIFT_MESSAGE_MAX).optional(),
    // Off by default - the recipient doesn't see what it cost.
    showPrice: z.boolean().optional(),
    source: trafficSourceField,
  }),
});

export const giftCodeSchema = z.object({ params: codeParams });

export const claimGiftSchema = z.object({
  params: codeParams,
  body: z.object({
    // Required for delivery; not needed when it's picked up from the store.
    addressId: z.string().min(1).optional(),
    // Number the seller calls (defaults to the address's phone).
    deliveryPhone: phoneField.optional(),
  }),
});

export const listGiftsSchema = z.object({
  query: z.object({
    box: z.enum(["sent", "received"]).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export type SendGiftInput = z.infer<typeof sendGiftSchema>["body"];
export type ClaimGiftInput = z.infer<typeof claimGiftSchema>["body"];
