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
