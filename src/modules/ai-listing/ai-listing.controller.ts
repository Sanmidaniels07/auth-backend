import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { aiListingStatusService, generateListingDraftService } from "./ai-listing.service";

/** Whether photo-to-listing is on, and how many tries the seller has left today. */
export const getAiListingStatus = asyncHandler(async (req: Request, res: Response) => {
  res.json(apiResponse(aiListingStatusService(req.user.id), "Photo-to-listing status"));
});

/** Suggested listing details from the seller's uploaded photos. Nothing is saved. */
export const createAiListingDraft = asyncHandler(async (req: Request, res: Response) => {
  const draft = await generateListingDraftService(req.user.id, req.body.imageUrls);
  res.json(apiResponse(draft, "Listing suggestion ready"));
});
