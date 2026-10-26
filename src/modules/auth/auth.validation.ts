import { z } from "zod";

import { optionalDateOfBirthField } from "../../utils/birthday";
import { displayNameField } from "../../utils/displayName";

export const signupSchema = z.object({
  body: z.object({
    name: displayNameField,
    email: z.string().email(),
    password: z.string().min(6),
    // Optional - powers birthday reminders for the people who follow you.
    dateOfBirth: optionalDateOfBirthField,
    // Seller share link they arrived through (?ref=CODE), if any.
    referralCode: z.string().trim().max(20).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string(),
    password: z.string().min(6),
  }),
});