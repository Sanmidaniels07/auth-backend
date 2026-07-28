import { z } from "zod";
import { OrderStatus, OrderItemStatus } from "@prisma/client";

export const listOrdersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(OrderStatus).optional(),
  }),
});

export const listSellerOrdersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(OrderItemStatus).optional(),
  }),
});

export const updateOrderItemStatusSchema = z.object({
  params: z.object({
    orderItemId: z.string(),
  }),
  body: z.object({
    status: z.nativeEnum(OrderItemStatus),
  }),
});

export const updateTrackingNumberSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    trackingNumber: z.string().trim().min(1),
  }),
});
