import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { getMyReferralStatsService, recordReferralVisitService } from "./referral.service";

export const recordReferralVisit = asyncHandler(
  async (req: Request, res: Response) => {
    await recordReferralVisitService(req.body.code, req.body.path);

    res.status(204).end();
  }
);

export const getMyReferralStats = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await getMyReferralStatsService(req.user.id);

    res.status(200).json(
      apiResponse(stats, "Referral stats fetched successfully")
    );
  }
);
