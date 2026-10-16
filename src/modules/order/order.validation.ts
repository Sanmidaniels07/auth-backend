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
    // Only used when status is DELIVERED: the buyer's handover code. With
    // it the item is delivered and confirmed at once; without it the buyer
    // is asked to confirm receipt.
    deliveryCode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Delivery code must be 6 digits.")
      .optional(),
  }),
});

export const confirmDeliverySchema = z.object({
  params: z.object({
    orderItemId: z.string(),
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
