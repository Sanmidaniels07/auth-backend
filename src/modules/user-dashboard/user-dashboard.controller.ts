import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { getUserDashboardService } from "./user-dashboard.service";

export const getUserDashboard = asyncHandler(
  async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;

    const dashboard = await getUserDashboardService(req.user.id, days);

    res.status(200).json(
      apiResponse(dashboard, "Dashboard fetched successfully")
    );
  }
);
