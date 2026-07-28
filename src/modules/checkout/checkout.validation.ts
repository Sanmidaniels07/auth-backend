import { z } from "zod";

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
  }),
});

export const verifyCheckoutSchema = z.object({
  params: z.object({
    reference: z.string(),
  }),
});
