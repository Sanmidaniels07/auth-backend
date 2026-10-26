import { z } from "zod";

export const stockAlertSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    // The sold-out option combination, when the product has options.
    variationId: z.string().min(1).optional(),
  }),
});

export const stockAlertsForProductSchema = z.object({
  params: z.object({
    productId: z.string().min(1),
  }),
});
