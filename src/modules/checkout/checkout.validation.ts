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
  }),
});
