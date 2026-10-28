import { z } from "zod";

import { isAllowedPushEndpoint } from "../../utils/webPush";

const endpointField = z
  .string()
  .trim()
  .max(2048)
  .refine(isAllowedPushEndpoint, "That isn't a browser push address.");

// The PushSubscription the browser gives the website (subscription.toJSON()).
export const subscribeSchema = z.object({
  body: z.object({
    endpoint: endpointField,
    keys: z.object({
      p256dh: z.string().min(1).max(256),
      auth: z.string().min(1).max(256),
    }),
  }),
});

export const unsubscribeSchema = z.object({
  body: z.object({
    endpoint: z.string().trim().max(2048),
  }),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>["body"];
