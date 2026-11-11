import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  getHeldPayoutsOverviewService,
  getMyPayoutsService,
  payHeldManuallyService,
  runHeldPayoutsService,
} from "./held-payout.service";

// Seller: what's coming, when, and what's been paid.
export const getMyPayouts = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(apiResponse(await getMyPayoutsService(req.user.id), "Payouts fetched successfully"));
});

// Admin: held money by seller, and failed transfers.
export const getHeldPayoutsOverview = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(apiResponse(await getHeldPayoutsOverviewService(), "Held payouts fetched successfully"));
});

// Admin: pay a seller's ready orders by hand.
export const payHeldManually = asyncHandler(async (req: Request<{ storeId: string }>, res: Response) => {
  const payout = await payHeldManuallyService(req.user.id, req.params.storeId, req.body?.note);
  res.status(201).json(apiResponse(payout, "Payout recorded"));
});

// Admin: run payouts now instead of waiting for the schedule.
export const runHeldPayouts = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(apiResponse(await runHeldPayoutsService({ force: true }), "Payout run finished"));
});
