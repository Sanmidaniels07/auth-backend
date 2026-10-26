import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  createStockAlertService,
  deleteStockAlertService,
  getMyStockAlertsForProductService,
} from "./stock-alert.service";

export const createStockAlert = asyncHandler(
  async (req: Request, res: Response) => {
    const alert = await createStockAlertService(req.user.id, req.body.productId, req.body.variationId);

    res.status(201).json(
      apiResponse(alert, "We'll let you know when it's back in stock")
    );
  }
);

export const deleteStockAlert = asyncHandler(
  async (req: Request, res: Response) => {
    await deleteStockAlertService(req.user.id, req.body.productId, req.body.variationId);

    res.status(200).json(
      apiResponse(null, "Back-in-stock alert removed")
    );
  }
);

export const getMyStockAlertsForProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await getMyStockAlertsForProductService(req.user.id, req.params.productId as string);

    res.status(200).json(
      apiResponse(result, "Back-in-stock alerts fetched successfully")
    );
  }
);
