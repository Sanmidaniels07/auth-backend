import { Request, Response } from "express";
import { ReportStatus, ReportTargetType } from "@prisma/client";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import {
  createReportService,
  listReportsService,
  updateReportStatusService,
} from "./report.service";

export const createReport = asyncHandler(
  async (req: Request, res: Response) => {
    const report = await createReportService(
      req.user.id,
      req.body.targetType,
      req.body.targetId,
      req.body.reason
    );

    res.status(201).json(
      apiResponse(report, "Report submitted successfully")
    );
  }
);

export const listReports = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as
      | ReportStatus
      | undefined;
    const targetType = req.query.targetType as
      | ReportTargetType
      | undefined;

    const result = await listReportsService(
      page,
      limit,
      status,
      targetType
    );

    res.status(200).json(
      apiResponse(result, "Reports fetched successfully")
    );
  }
);

export const updateReportStatus = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const report = await updateReportStatusService(
      req.user.id,
      req.params.id,
      req.body.status
    );

    res.status(200).json(
      apiResponse(
        report,
        "Report status updated successfully"
      )
    );
  }
);
