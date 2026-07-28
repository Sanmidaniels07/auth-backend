import { z } from "zod";
import { ReturnRequestStatus } from "@prisma/client";

export const createReturnRequestSchema = z.object({
  body: z.object({
    orderItemId: z.string(),
    reason: z.string().trim().min(3),
  }),
});

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
