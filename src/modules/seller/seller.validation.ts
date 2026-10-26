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
    // "" removes it. Stored uppercase without spaces, e.g. RC1234567.
    cacNumber: z
      .string()
      .trim()
      .max(20, "That doesn't look like a CAC number.")
      .regex(/^[A-Za-z0-9\s-]*$/, "Use letters and numbers only, e.g. RC1234567.")
      .transform((value) => value.replace(/[\s-]+/g, "").toUpperCase())
      .optional(),
  }),
});

export type BecomeSellerInput =
  z.infer<typeof becomeSellerSchema>["body"];

export type UpdateSellerInput =
  z.infer<typeof updateSellerSchema>["body"];