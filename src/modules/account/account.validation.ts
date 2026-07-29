import { z } from "zod";

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  }),
});

export const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string().min(1),
  }),
});

export const revokeSessionSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});