import { z } from "zod";

export const recentOrdersSchema = z.object({
  query: z.object({
    limit: z.string().optional(),
  }),
});

export const inventorySnapshotSchema = z.object({
  query: z.object({
    threshold: z.string().optional(),
  }),
});

export const salesOverviewSchema = z.object({
  query: z.object({
    days: z.string().optional(),
  }),
});

export const topProductsSchema = z.object({
  query: z.object({
    limit: z.string().optional(),
  }),
});

export const sellerCustomersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const customerMapSchema = z.object({
  query: z.object({
    // 1-365 days back from today (default 90).
    days: z.coerce.number().int().min(1).max(365).optional(),
  }),
});
