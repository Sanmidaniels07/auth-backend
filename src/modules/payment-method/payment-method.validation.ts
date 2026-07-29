import { z } from "zod";

export const savedCardIdSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});
