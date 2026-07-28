import { ReportTargetType, ReportStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

const validateTargetExists = async (
  targetType: ReportTargetType,
  targetId: string
) => {
  let exists = false;

  switch (targetType) {
    case ReportTargetType.POST:
      exists = !!(await prisma.post.findUnique({
        where: { id: targetId },
      }));
      break;
    case ReportTargetType.USER:
      exists = !!(await prisma.user.findUnique({
        where: { id: targetId },
      }));
      break;
    case ReportTargetType.PRODUCT:
      exists = !!(await prisma.product.findUnique({
        where: { id: targetId },
      }));
      break;
    case ReportTargetType.STORE:
      exists = !!(await prisma.store.findUnique({
        where: { id: targetId },
      }));
      break;
  }

  if (!exists) {
    throw new AppError(
      `${targetType.toLowerCase()} not found.`,
      404
    );
  }
};

export const createReportService = async (
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: string
) => {
  await validateTargetExists(targetType, targetId);

  return prisma.report.create({
    data: { reporterId, targetType, targetId, reason },
  });
};

export const listReportsService = async (
  page: number,
  limit: number,
  status?: ReportStatus,
  targetType?: ReportTargetType
) => {
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (targetType) where.targetType = targetType;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return {
    reports,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const updateReportStatusService = async (
  adminUserId: string,
  reportId: string,
  status: ReportStatus
) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new AppError("Report not found.", 404);
  }

  return prisma.report.update({
    where: { id: reportId },
    data: {
      status,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
    },
  });
};
