import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { createOfferService, respondOfferService, withdrawOfferService } from "./offer.service";

export const createOffer = asyncHandler(async (req: Request, res: Response) => {
  const message = await createOfferService(req.user.id, req.body);
  res.status(201).json(apiResponse(message, "Offer sent"));
});

export const respondOffer = asyncHandler(async (req: Request, res: Response) => {
  const result = await respondOfferService(req.user.id, req.params.id as string, req.body);
  res.status(200).json(apiResponse(result, "Offer answered"));
});

export const withdrawOffer = asyncHandler(async (req: Request, res: Response) => {
  const result = await withdrawOfferService(req.user.id, req.params.id as string);
  res.status(200).json(apiResponse(result, "Offer withdrawn"));
});
