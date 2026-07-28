import { z } from "zod";

export const initiateCheckoutSchema = z.object({
  body: z.object({
    addressId: z.string(),
  }),
});

export const verifyCheckoutSchema = z.object({
  params: z.object({
    reference: z.string(),
  }),
});
