import { CacCompanyType } from "@prisma/client";
import { z } from "zod";

import { socialFields } from "../store/store.validation";

// A CAC number as sellers type it: letters and digits, any spaces or dashes
// dropped, stored uppercase - e.g. "rc 123-4567" -> "RC1234567". "" means none.
const cacNumberField = z
  .string()
  .trim()
  .max(20, "That doesn't look like a CAC number.")
  .regex(/^[A-Za-z0-9\s-]*$/, "Use letters and numbers only, e.g. RC1234567.")
  .transform((value) => value.replace(/[\s-]+/g, "").toUpperCase())
  .refine((value) => value === "" || /\d{4,}/.test(value), "That doesn't look like a CAC number.");

// Which register the number is on - business name (BN), company (RC),
// incorporated trustees (IT), limited partnership, LLP. Optional: inferred
// from the number's prefix (BN/RC/IT/LP/LLP), else treated as a company.
const cacCompanyTypeField = z.nativeEnum(CacCompanyType, {
  message: "Pick a business type: business name, company, incorporated trustees, LP or LLP.",
});

export const becomeSellerSchema = z.object({
  body: z.object({
    cacNumber: cacNumberField.optional(),
    cacCompanyType: cacCompanyTypeField.optional(),
  }),
});

export const updateSellerSchema = z.object({
  body: z.object({
    cacNumber: cacNumberField.optional(),
    cacCompanyType: cacCompanyTypeField.optional(),
  }),
});

// Quick start: from nothing to a live store in one step - the store name,
// the Seller Agreement, and (optionally) CAC and where buyers know them.
export const quickStartSellerSchema = z.object({
  body: z.object({
    storeName: z.string().trim().min(2, "Give your store a name.").max(60, "Keep the store name under 60 characters."),
    instagram: socialFields.instagram,
    whatsapp: socialFields.whatsapp,
    cacNumber: cacNumberField.optional(),
    cacCompanyType: cacCompanyTypeField.optional(),
    agreeToSellerTerms: z.literal(true, { message: "Agree to the Seller Agreement to start selling." }),
  }),
});

export type QuickStartSellerInput = z.infer<typeof quickStartSellerSchema>["body"];

export type BecomeSellerInput =
  z.infer<typeof becomeSellerSchema>["body"];

export type UpdateSellerInput =
  z.infer<typeof updateSellerSchema>["body"];
