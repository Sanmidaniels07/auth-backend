import { z } from "zod";

export const signupSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
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