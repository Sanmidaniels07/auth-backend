import { z } from "zod";

export const becomeSellerSchema = z.object({
  body: z.object({
    cacNumber: z
      .string()
      .trim()
      .optional(),
  }),
});

export const updateSellerSchema = z.object({
  body: z.object({
    cacNumber: z
      .string()
      .trim()
      .optional(),
  }),
});

export type BecomeSellerInput =
  z.infer<typeof becomeSellerSchema>["body"];

export type UpdateSellerInput =
  z.infer<typeof updateSellerSchema>["body"];