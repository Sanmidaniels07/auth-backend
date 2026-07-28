import { Request, Response } from "express";
import { ReturnRequestStatus } from "@prisma/client";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import {
  createReturnRequestService,
  getCustomerReturnRequestsService,
  getSellerReturnRequestsService,
  updateReturnRequestStatusService,
} from "./return-request.service";

export const createReturnRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const returnRequest = await createReturnRequestService(
      req.user.id,
      req.body.orderItemId,
      req.body.reason
    );

    res.status(201).json(
      apiResponse(
        returnRequest,
        "Return request submitted successfully"
      )
    );
  }
);

export const getCustomerReturnRequests = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as
      | ReturnRequestStatus
      | undefined;

    const result = await getCustomerReturnRequestsService(
      req.user.id,
      page,
      limit,
      status
    );

    res.status(200).json(
      apiResponse(
        result,
        "Return requests fetched successfully"
      )
    );
  }
);

export const getSellerReturnRequests = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as
      | ReturnRequestStatus
      | undefined;

    const result = await getSellerReturnRequestsService(
      req.user.id,
      page,
      limit,
      status
    );

    res.status(200).json(
      apiResponse(
        result,
        "Return requests fetched successfully"
      )
    );
  }
);

export const updateReturnRequestStatus = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const returnRequest =
      await updateReturnRequestStatusService(
        req.user.id,
        req.params.id,
        req.body.status
      );

    res.status(200).json(
      apiResponse(
        returnRequest,
        "Return request status updated successfully"
      )
    );
  }
);
