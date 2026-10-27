import { z } from "zod";

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  }),
});

// Accounts with a password confirm with it; Google-only accounts confirm by
// signing in with Google again (googleCredential).
export const deleteAccountSchema = z.object({
  body: z
    .object({
      password: z.string().min(1).optional(),
      googleCredential: z.string().min(20).max(4096).optional(),
    })
    .refine((body) => body.password || body.googleCredential, {
      message: "Confirm with your password or Google account.",
    }),
});

export const revokeSessionSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});