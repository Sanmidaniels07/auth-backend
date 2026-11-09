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

export const updateReturnRequestStatusSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    status: z.nativeEnum(ReturnRequestStatus),
  }),
});
