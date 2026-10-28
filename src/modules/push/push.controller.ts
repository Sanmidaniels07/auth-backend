import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { getPushConfigService, sendTestPushService, subscribeService, unsubscribeService } from "./push.service";

export const getPushConfig = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(apiResponse(getPushConfigService(), "Push config fetched successfully"));
});

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const result = await subscribeService(req.user.id, req.body, req.headers["user-agent"]?.slice(0, 300));
  res.status(201).json(apiResponse(result, "Notifications turned on for this device"));
});

export const unsubscribe = asyncHandler(async (req: Request, res: Response) => {
  const result = await unsubscribeService(req.user.id, req.body.endpoint);
  res.status(200).json(apiResponse(result, "Notifications turned off for this device"));
});

export const sendTestPush = asyncHandler(async (req: Request, res: Response) => {
  const result = await sendTestPushService(req.user.id);
  res.status(200).json(apiResponse(result, "Test notification sent"));
});
