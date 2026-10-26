import { z } from "zod";

export const recordReferralVisitSchema = z.object({
  body: z.object({
    code: z.string().trim().min(4).max(20),
    // The page they landed on, e.g. /marketplace/product/abc.
    path: z.string().trim().max(300).optional(),
  }),
});
