import { Request, Response } from "express";
import { ReturnRequestStatus } from "@prisma/client";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import {
  buyerReturnActionService,
  createReturnRequestService,
  decideReturnRequestService,
  getCustomerReturnRequestsService,
  getSellerReturnRequestsService,
  listAdminReturnRequestsService,
  respondToReturnRequestService,
} from "./return-request.service";

const listParams = (req: Request) => ({
  page: Number(req.query.page) || 1,
  limit: Math.min(Number(req.query.limit) || 20, 100),
  status: req.query.status as ReturnRequestStatus | undefined,
});

export const createReturnRequest = asyncHandler(async (req: Request, res: Response) => {
  const returnRequest = await createReturnRequestService(req.user.id, req.body);
  res.status(201).json(apiResponse(returnRequest, "Problem reported - the seller has been told"));
});

export const getCustomerReturnRequests = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status } = listParams(req);
  const result = await getCustomerReturnRequestsService(req.user.id, page, limit, status);
  res.status(200).json(apiResponse(result, "Return requests fetched successfully"));
});

export const getSellerReturnRequests = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status } = listParams(req);
  const result = await getSellerReturnRequestsService(req.user.id, page, limit, status);
  res.status(200).json(apiResponse(result, "Return requests fetched successfully"));
});

export const respondToReturnRequest = asyncHandler(async (req: Request<IdParams>, res: Response) => {
  const result = await respondToReturnRequestService(req.user.id, req.params.id, req.body);
  res.status(200).json(apiResponse(result, "Answer sent"));
});

export const buyerReturnAction = asyncHandler(async (req: Request<IdParams>, res: Response) => {
  const result = await buyerReturnActionService(req.user.id, req.params.id, req.body);
  res.status(200).json(apiResponse(result, "Report updated"));
});

export const listAdminReturnRequests = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status } = listParams(req);
  const result = await listAdminReturnRequestsService(page, limit, status);
  res.status(200).json(apiResponse(result, "Return requests fetched successfully"));
});

export const decideReturnRequest = asyncHandler(async (req: Request<IdParams>, res: Response) => {
  const result = await decideReturnRequestService(req.user.id, req.params.id, req.body);
  res.status(200).json(apiResponse(result, "Decision saved"));
});
