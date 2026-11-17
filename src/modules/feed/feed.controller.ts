import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { getShoppingFeedService } from "./shopping-feed.service";

export const getShoppingFeed = asyncHandler(async (req: Request, res: Response) => {
  const before = req.query.before ? new Date(String(req.query.before)) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const feed = await getShoppingFeedService(req.user.id, before, limit);
  res.status(200).json(apiResponse(feed, "Feed fetched successfully"));
});
