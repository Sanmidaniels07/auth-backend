import { z } from "zod";

import { trafficSourceField } from "../../utils/trafficSource";
import { phoneField } from "../payment-link/payment-link.validation";

export const SELLER_NOTE_MAX = 500;

// Optional per-store note from the buyer (extras, sizes, gift message).
const sellerNotesSchema = z
  .array(
    z.object({
      storeId: z.string(),
      note: z.string().trim().max(SELLER_NOTE_MAX, `Notes can be up to ${SELLER_NOTE_MAX} characters.`),
    })
  )
  .max(50)
  .optional();

// Phone the seller calls to deliver (defaults to the address's phone).
const deliveryPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number for delivery, e.g. 0803 123 4567.")
  .optional();

export const initiateCheckoutSchema = z.object({
  body: z.object({
    addressId: z.string(),
    shippingSelections: z
      .array(
        z.object({
          storeId: z.string(),
          shippingOptionId: z.string(),
        })
      )
      .optional(),
    couponCode: z.string().trim().optional(),
    sellerNotes: sellerNotesSchema,
    deliveryPhone: deliveryPhoneSchema,
    source: trafficSourceField,
  }),
});

export const verifyCheckoutSchema = z.object({
  params: z.object({
    reference: z.string(),
  }),
});

export const checkoutWithSavedCardSchema = z.object({
  body: z.object({
    addressId: z.string(),
    savedCardId: z.string(),
    shippingSelections: z
      .array(
        z.object({
          storeId: z.string(),
          shippingOptionId: z.string(),
        })
      )
      .optional(),
    couponCode: z.string().trim().optional(),
    sellerNotes: sellerNotesSchema,
    deliveryPhone: deliveryPhoneSchema,
    source: trafficSourceField,
  }),
});

// Guest checkout (no account): the cart lives in the browser.
const guestLinesSchema = z
  .array(
    z.object({
      productId: z.string().min(1),
      variationId: z.string().min(1).nullable().optional(),
      quantity: z.number().int().min(1).max(1000),
    })
  )
  .min(1, "Your cart is empty.")
  .max(50, "That's a lot of items - check out up to 50 at a time.");

export const guestCartQuoteSchema = z.object({
  body: z.object({ items: guestLinesSchema }),
});

export const guestCheckoutSchema = z.object({
  body: z.object({
    items: guestLinesSchema,
    name: z.string().trim().min(2, "Enter your name.").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
    phone: phoneField,
    // Not needed when everything is picked up.
    address: z.string().trim().min(5, "Enter your street address.").max(300).optional(),
    city: z.string().trim().min(2, "Enter your city or area.").max(80).optional(),
    state: z.string().trim().min(2, "Choose your state.").max(80).optional(),
    shippingSelections: z.array(z.object({ storeId: z.string(), shippingOptionId: z.string() })).min(1),
    sellerNotes: sellerNotesSchema,
    source: trafficSourceField,
    referralCode: z.string().trim().max(20).optional(),
  }),
});
