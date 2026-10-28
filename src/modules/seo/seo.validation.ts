import { z } from "zod";

export const areaSellersSchema = z.object({
  query: z.object({
    // Any common spelling, e.g. "Lagos" or "Abuja".
    state: z.string().trim().min(1).max(60),
    // A known area of that state, e.g. "Lekki".
    area: z.string().trim().min(1).max(60),
    // Category slug - only sellers with live products in it.
    category: z.string().trim().max(80).optional(),
  }),
});
