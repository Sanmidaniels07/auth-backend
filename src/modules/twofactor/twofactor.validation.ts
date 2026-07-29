import { z } from "zod";

export const verifyTwoFactorSetupSchema = z.object({
  body: z.object({
    token: z.string().trim().length(6),
  }),
});

export const disableTwoFactorSchema = z.object({
  body: z.object({
    token: z.string().trim().length(6),
  }),
});

export const loginTwoFactorSchema = z.object({
  body: z.object({
    twoFactorToken: z.string(),
    token: z.string().trim().length(6),
  }),
});