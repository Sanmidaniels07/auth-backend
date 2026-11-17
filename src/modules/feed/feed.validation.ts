import { z } from "zod";

// GET /api/feed?before=<the previous page's nextBefore>&limit=20&near=true
export const shoppingFeedSchema = z.object({
  query: z.object({
    before: z.coerce.date({ message: "before must be a date, e.g. the previous page's nextBefore." }).optional(),
    limit: z.coerce.number().int().min(5).max(40).optional(),
    // "Near me": only stores based in or delivering to the viewer's area.
    near: z.enum(["true", "false"]).optional(),
  }),
});

// The area "Near me" uses. A state alone means the whole state.
export const setFeedAreaSchema = z.object({
  body: z.object({
    state: z.string().trim().min(2, "Choose your state."),
    area: z.string().trim().min(2).max(80).nullable().optional(),
  }),
});

export const feedAreaOptionsSchema = z.object({
  query: z.object({ state: z.string().trim().min(2, "Choose your state.") }),
});
