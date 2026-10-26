import { z } from "zod";

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
  }),
});
