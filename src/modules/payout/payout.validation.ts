import { z } from "zod";

export const createPayoutSchema = z.object({
  body: z.object({
    storeId: z.string(),
    amount: z.number().positive(),
    note: z.string().trim().optional(),
  }),
});

export const listPayoutsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    storeId: z.string().optional(),
  }),
});

export const payHeldManuallySchema = z.object({
  params: z.object({ storeId: z.string() }),
  body: z.object({ note: z.string().trim().max(300).optional() }).optional(),
});
