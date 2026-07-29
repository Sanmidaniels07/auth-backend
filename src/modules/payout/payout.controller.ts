import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  createPayoutService,
  listPayoutsService,
} from "./payout.service";

export const createPayout = asyncHandler(
  async (req: Request, res: Response) => {
    const payout = await createPayoutService(
      req.user.id,
      req.body.storeId,
      req.body.amount,
      req.body.note
    );

    res.status(201).json(
      apiResponse(payout, "Payout recorded successfully")
    );
  }
);

export const listPayouts = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const storeId = req.query.storeId as string;

    const result = await listPayoutsService(
      page,
      limit,
      storeId
    );

    res.status(200).json(
      apiResponse(result, "Payouts fetched successfully")
    );
  }
);
