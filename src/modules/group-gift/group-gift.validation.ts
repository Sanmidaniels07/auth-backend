import { z } from "zod";

const DAY_MS = 24 * 60 * 60 * 1000;

// Starting a group gift: the same item and delivery choice as a gift, plus
// a deadline (between 12 hours and 30 days away).
export const startGroupGiftSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    variationId: z.string().min(1).optional(),
    shippingOptionId: z.string().min(1, "Choose how the gift gets to them."),
    recipientId: z.string().min(1).optional(),
    recipientName: z.string().trim().min(1, "Who is the gift for?").max(60),
    message: z.string().trim().max(500).optional(),
    deadline: z.coerce
      .date()
      .refine((date) => date.getTime() >= Date.now() + DAY_MS / 2, "Give friends at least 12 hours to chip in.")
      .refine((date) => date.getTime() <= Date.now() + 30 * DAY_MS, "Choose a deadline within 30 days."),
  }),
});

export const groupGiftCodeSchema = z.object({
  params: z.object({ code: z.string().min(4).max(32) }),
});

export const contributeSchema = z.object({
  params: z.object({ code: z.string().min(4).max(32) }),
  body: z.object({
    amount: z.number().positive("Enter how much you'd like to chip in.").max(100_000_000),
    message: z.string().trim().max(200).optional(),
    hideName: z.boolean().optional(),
  }),
});

export const contributionReferenceSchema = z.object({
  params: z.object({ reference: z.string().min(10).max(80) }),
});

export type StartGroupGiftInput = z.infer<typeof startGroupGiftSchema>["body"];
export type ContributeInput = z.infer<typeof contributeSchema>["body"];
