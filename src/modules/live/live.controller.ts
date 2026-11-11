import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  banViewerService,
  buyFromLiveService,
  cancelLiveService,
  createLiveService,
  endLiveService,
  getHostTokenService,
  getLiveCalendarService,
  getLiveSummaryService,
  getMyLivesService,
  getPublicLiveService,
  getWatchTokenService,
  listLivesService,
  pinProductService,
  removeMessageService,
  setInterestService,
  startLiveService,
  updateLiveService,
} from "./live.service";

const param = (req: Request, name: string) => req.params[name] as string;

// Seller

export const createLive = asyncHandler(async (req: Request, res: Response) => {
  const live = await createLiveService(req.user.id, req.body);
  res.status(201).json(apiResponse(live, "Live scheduled"));
});

export const getMyLives = asyncHandler(async (req: Request, res: Response) => {
  const data = await getMyLivesService(req.user.id);
  res.status(200).json(apiResponse(data, "Lives fetched successfully"));
});

export const updateLive = asyncHandler(async (req: Request, res: Response) => {
  const live = await updateLiveService(req.user.id, param(req, "id"), req.body);
  res.status(200).json(apiResponse(live, "Live updated"));
});

export const cancelLive = asyncHandler(async (req: Request, res: Response) => {
  const live = await cancelLiveService(req.user.id, param(req, "id"));
  res.status(200).json(apiResponse(live, "Live cancelled"));
});

export const startLive = asyncHandler(async (req: Request, res: Response) => {
  const data = await startLiveService(req.user.id, param(req, "id"));
  res.status(200).json(apiResponse(data, "You're live"));
});

export const getHostToken = asyncHandler(async (req: Request, res: Response) => {
  const data = await getHostTokenService(req.user.id, param(req, "id"));
  res.status(200).json(apiResponse(data, "Reconnected"));
});

export const endLive = asyncHandler(async (req: Request, res: Response) => {
  const data = await endLiveService(req.user.id, param(req, "id"));
  res.status(200).json(apiResponse(data, "Live ended"));
});

export const pinProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = await pinProductService(req.user.id, param(req, "id"), req.body.productId);
  res.status(200).json(apiResponse(data, req.body.productId ? "Product pinned" : "Product unpinned"));
});

export const removeMessage = asyncHandler(async (req: Request, res: Response) => {
  const data = await removeMessageService(req.user.id, param(req, "id"), param(req, "messageId"));
  res.status(200).json(apiResponse(data, "Message removed"));
});

export const banViewer = asyncHandler(async (req: Request, res: Response) => {
  const data = await banViewerService(req.user.id, param(req, "id"), req.body.userId);
  res.status(200).json(apiResponse(data, "Viewer blocked from chat"));
});

export const getLiveSummary = asyncHandler(async (req: Request, res: Response) => {
  const data = await getLiveSummaryService(req.user.id, param(req, "id"));
  res.status(200).json(apiResponse(data, "Live summary fetched successfully"));
});

// Public

export const listLives = asyncHandler(async (req: Request, res: Response) => {
  const data = await listLivesService(req.query.store as string | undefined);
  res.status(200).json(apiResponse(data, "Lives fetched successfully"));
});

export const getPublicLive = asyncHandler(async (req: Request, res: Response) => {
  const data = await getPublicLiveService(param(req, "code"), req.user?.id);
  res.status(200).json(apiResponse(data, "Live fetched successfully"));
});

export const getLiveCalendar = asyncHandler(async (req: Request, res: Response) => {
  const { filename, body } = await getLiveCalendarService(param(req, "code"));
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(body);
});

export const addInterest = asyncHandler(async (req: Request, res: Response) => {
  const data = await setInterestService(req.user.id, param(req, "code"), true);
  res.status(200).json(apiResponse(data, "We'll remind you"));
});

export const removeInterest = asyncHandler(async (req: Request, res: Response) => {
  const data = await setInterestService(req.user.id, param(req, "code"), false);
  res.status(200).json(apiResponse(data, "Reminder removed"));
});

export const getWatchToken = asyncHandler(async (req: Request, res: Response) => {
  const data = await getWatchTokenService(param(req, "code"), req.user?.id);
  res.status(200).json(apiResponse(data, "Enjoy the live"));
});

export const buyFromLive = asyncHandler(async (req: Request, res: Response) => {
  const data = await buyFromLiveService(req.user.id, param(req, "code"), req.body);
  res.status(201).json(apiResponse(data, "Payment started"));
});
