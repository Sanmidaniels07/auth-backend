import { z } from "zod";
import { ReportTargetType, ReportStatus } from "@prisma/client";

export const createReportSchema = z.object({
  body: z.object({
    targetType: z.nativeEnum(ReportTargetType),
    targetId: z.string(),
    reason: z.string().trim().min(3),
  }),
});

export const listReportsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(ReportStatus).optional(),
    targetType: z.nativeEnum(ReportTargetType).optional(),
  }),
});

export const updateReportStatusSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    status: z.nativeEnum(ReportStatus),
  }),
});
