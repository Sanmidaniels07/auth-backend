import { z } from "zod";

const socialLinksSchema = z.object({
  twitter: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
  facebook: z.string().trim().optional(),
  linkedin: z.string().trim().optional(),
  tiktok: z.string().trim().optional(),
  youtube: z.string().trim().optional(),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(
        /^[a-zA-Z0-9_.]+$/,
        "Username can only contain letters, numbers, underscores, and periods"
      )
      .optional(),
    avatar: z.string().trim().optional(),
    cover: z.string().trim().optional(),
    bio: z.string().trim().max(280).optional(),
    location: z.string().trim().max(100).optional(),
    website: z.string().trim().optional(),
    socialLinks: socialLinksSchema.optional(),
    occupation: z.string().trim().max(100).optional(),
    company: z.string().trim().max(100).optional(),
    education: z.string().trim().max(150).optional(),
    dateOfBirth: z.coerce.date().optional(),
    skills: z.array(z.string().trim().min(1)).max(20).optional(),
    interests: z.array(z.string().trim().min(1)).max(20).optional(),
    languages: z.array(z.string().trim().min(1)).max(20).optional(),
  }),
});

export type UpdateProfileInput = z.infer<
  typeof updateProfileSchema
>["body"];