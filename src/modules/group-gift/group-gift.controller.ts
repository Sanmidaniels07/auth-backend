import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  cancelGroupGiftService,
  contributeService,
  getGroupGiftService,
  startGroupGiftService,
  verifyContributionService,
} from "./group-gift.service";

export const startGroupGift = asyncHandler(async (req: Request, res: Response) => {
  const groupGift = await startGroupGiftService(req.user.id, req.body);
  res.status(201).json(apiResponse(groupGift, "Group gift started"));
});

export const getGroupGift = asyncHandler(async (req: Request, res: Response) => {
  const groupGift = await getGroupGiftService(req.params.code as string, req.user?.id);
  res.status(200).json(apiResponse(groupGift, "Group gift fetched successfully"));
});

export const contribute = asyncHandler(async (req: Request, res: Response) => {
  const payment = await contributeService(req.user.id, req.params.code as string, req.body);
  res.status(201).json(apiResponse(payment, "Payment started"));
});

export const verifyContribution = asyncHandler(async (req: Request, res: Response) => {
  const groupGift = await verifyContributionService(req.user.id, req.params.reference as string);
  res.status(200).json(apiResponse(groupGift, "Contribution confirmed"));
});

export const cancelGroupGift = asyncHandler(async (req: Request, res: Response) => {
  const groupGift = await cancelGroupGiftService(req.user.id, req.params.code as string);
  res.status(200).json(apiResponse(groupGift, "Group gift called off"));
});
