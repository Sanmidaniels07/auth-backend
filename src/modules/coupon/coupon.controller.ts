import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import {
  createCouponService,
  listCouponsService,
  updateCouponService,
  validateCouponAgainstCartService,
} from "./coupon.service";

export const createCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const coupon = await createCouponService(req.body);

    res.status(201).json(
      apiResponse(coupon, "Coupon created successfully")
    );
  }
);

export const listCoupons = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await listCouponsService(page, limit);

    res.status(200).json(
      apiResponse(result, "Coupons fetched successfully")
    );
  }
);

export const updateCoupon = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const coupon = await updateCouponService(
      req.params.id,
      req.body
    );

    res.status(200).json(
      apiResponse(coupon, "Coupon updated successfully")
    );
  }
);

export const validateCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await validateCouponAgainstCartService(
      req.user.id,
      req.body.code
    );

    res.status(200).json(
      apiResponse(result, "Coupon is valid")
    );
  }
);
