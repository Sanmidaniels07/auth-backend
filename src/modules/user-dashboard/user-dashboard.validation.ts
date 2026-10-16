import { z } from "zod";

export const ACTIVITY_RANGES = ["7", "30", "90"] as const;

export const userDashboardSchema = z.object({
  query: z.object({
    days: z.enum(ACTIVITY_RANGES).optional(),
  }),
});
