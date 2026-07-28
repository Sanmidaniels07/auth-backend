import { z } from "zod";
import { CouponType } from "@prisma/client";

export const createCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(3).max(30),
    type: z.nativeEnum(CouponType),
    value: z.number().positive(),
    minOrderAmount: z.number().min(0).optional(),
    usageLimit: z.number().int().positive().optional(),
    expiresAt: z.coerce.date().optional(),
  }),
});

export const updateCouponSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    value: z.number().positive().optional(),
    minOrderAmount: z.number().min(0).optional(),
    usageLimit: z.number().int().positive().optional(),
    expiresAt: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const listCouponsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const validateCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1),
  }),
});
