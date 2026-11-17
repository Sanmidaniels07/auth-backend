import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { getShoppingFeedService } from "./shopping-feed.service";
import { feedAreaOptionsService, resolveFeedArea, setFeedAreaService } from "./feed-area.service";

export const getShoppingFeed = asyncHandler(async (req: Request, res: Response) => {
  const before = req.query.before ? new Date(String(req.query.before)) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const feed = await getShoppingFeedService(req.user.id, before, limit, req.query.near === "true");
  res.status(200).json(apiResponse(feed, "Feed fetched successfully"));
});

export const getFeedArea = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(apiResponse(await resolveFeedArea(req.user.id), "Area fetched successfully"));
});

export const setFeedArea = asyncHandler(async (req: Request, res: Response) => {
  const area = await setFeedAreaService(req.user.id, req.body);
  res.status(200).json(apiResponse(area, "Area saved"));
});

export const getFeedAreaOptions = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(apiResponse(feedAreaOptionsService(String(req.query.state)), "Areas fetched successfully"));
});
