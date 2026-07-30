import { z } from "zod";
import { Role, UserStatus, SellerStatus } from "@prisma/client";

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    role: z.nativeEnum(Role),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z
    .object({
      status: z.nativeEnum(UserStatus),
      reason: z.string().trim().min(1).optional(),
    })
    .refine(
      (data) => data.status === UserStatus.ACTIVE || !!data.reason,
      {
        message:
          "A reason is required when suspending or banning a user.",
        path: ["reason"],
      }
    ),
});

export const listUsersAdminSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  }),
});

export const updateSellerStatusSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z
    .object({
      status: z.enum(["APPROVED", "REJECTED"]),
      reason: z.string().trim().min(1).optional(),
    })
    .refine(
      (data) => data.status === "APPROVED" || !!data.reason,
      {
        message: "A reason is required when rejecting a seller.",
        path: ["reason"],
      }
    ),
});

export const listSellersAdminSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(SellerStatus).optional(),
  }),
});
