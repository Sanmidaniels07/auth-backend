import { z } from "zod";
import { ReturnReason, ReturnRequestStatus } from "@prisma/client";

export const RETURN_PHOTOS_MAX = 5;

// Only these problems qualify under Nestly's returns policy (no change of
// mind). Perishables need at least one photo - they aren't sent back.
export const createReturnRequestSchema = z.object({
  body: z.object({
    orderItemId: z.string(),
    reasonType: z.nativeEnum(ReturnReason, {
      message: "Choose what's wrong: damaged, spoiled, wrong item, not as described, faulty or not received.",
    }),
    reason: z.string().trim().min(3, "Tell the seller what happened.").max(1000),
    photos: z
      .array(z.string().url().startsWith("https://", "Photos must be uploaded images."))
      .max(RETURN_PHOTOS_MAX, `Add up to ${RETURN_PHOTOS_MAX} photos.`)
      .optional(),
  }),
});

export type CreateReturnRequestInput = z.infer<typeof createReturnRequestSchema>["body"];

export const listReturnRequestsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(ReturnRequestStatus).optional(),
  }),
});

const idParams = z.object({ id: z.string() });

// The seller's answer. Disagreeing needs a reason - Nestly reads it to decide.
export const sellerReturnResponseSchema = z.object({
  params: idParams,
  body: z
    .object({
      action: z.enum(["REFUND", "REPLACE", "DISAGREE"], { message: "Choose refund, replacement or disagree." }),
      note: z.string().trim().max(1000).optional(),
    })
    .refine((body) => body.action !== "DISAGREE" || (body.note?.length ?? 0) >= 10, {
      message: "Tell us why you disagree (at least 10 characters) - Nestly reads it to decide.",
      path: ["note"],
    }),
});

export type SellerReturnResponseInput = z.infer<typeof sellerReturnResponseSchema>["body"];

export const buyerReturnActionSchema = z.object({
  params: idParams,
  body: z
    .object({
      action: z.enum(["KEEP", "REPLACEMENT_RECEIVED", "REPLACEMENT_PROBLEM"]),
      note: z.string().trim().max(1000).optional(),
    })
    .refine((body) => body.action !== "REPLACEMENT_PROBLEM" || (body.note?.length ?? 0) >= 3, {
      message: "Tell us what's wrong with the replacement.",
      path: ["note"],
    }),
});

export type BuyerReturnActionInput = z.infer<typeof buyerReturnActionSchema>["body"];

export const decideReturnSchema = z.object({
  params: idParams,
  body: z.object({
    decision: z.enum(["REFUND", "REJECT"]),
    // Shown to the buyer and seller.
    note: z.string().trim().max(1000).optional(),
  }),
});

export type DecideReturnInput = z.infer<typeof decideReturnSchema>["body"];
