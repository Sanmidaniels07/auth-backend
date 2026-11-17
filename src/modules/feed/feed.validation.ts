import { z } from "zod";

// GET /api/feed?before=<the previous page's nextBefore>&limit=20
export const shoppingFeedSchema = z.object({
  query: z.object({
    before: z.coerce.date({ message: "before must be a date, e.g. the previous page's nextBefore." }).optional(),
    limit: z.coerce.number().int().min(5).max(40).optional(),
  }),
});
