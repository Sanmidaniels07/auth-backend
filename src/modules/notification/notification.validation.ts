import { z } from "zod";
import { NotificationType } from "@prisma/client";

export const updatePreferenceSchema = z.object({
  body: z.object({
    type: z.nativeEnum(NotificationType),
    enabled: z.boolean(),
  }),
});

export const registerPushTokenSchema = z.object({
  body: z.object({
    token: z.string().trim().min(1),
    platform: z.string().trim().optional(),
  }),
});

export const unregisterPushTokenSchema = z.object({
  params: z.object({
    token: z.string(),
  }),
});