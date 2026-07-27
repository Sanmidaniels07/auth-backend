import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import {
  becomeSellerService,
  getSellerProfileService,
  updateSellerService,
} from "./seller.service";

export const becomeSeller = asyncHandler(
  async (req: Request, res: Response) => {

    const seller = await becomeSellerService(
      req.user.id,
      req.body.cacNumber
    );

    res.status(201).json({
      success: true,
      message: "Seller profile created successfully.",
      data: seller,
    });
  }
);

export const getSellerProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const seller = await getSellerProfileService(
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "Seller profile fetched successfully.",
      data: seller,
    });
  }
);

export const updateSeller = asyncHandler(
  async (req: Request, res: Response) => {
    const seller = await updateSellerService(
      req.user.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Seller profile updated successfully.",
      data: seller,
    });
  }
);