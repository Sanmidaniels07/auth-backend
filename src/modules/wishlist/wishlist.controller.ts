import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdentifierParams, WishlistParams } from "../../types/request.types";
import {
  addToWishlistService,
  getWishlistService,
  removeFromWishlistService,
  updateWishlistVisibilityService,
  getUserWishlistService,
} from "./wishlist.service";

export const addToWishlist = asyncHandler(
  async (req: Request, res: Response) => {
    const item = await addToWishlistService(
      req.user.id,
      req.body.productId
    );

    res.status(201).json(
      apiResponse(item, "Product added to wishlist")
    );
  }
);

export const getWishlist = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;

    const result = await getWishlistService(
      req.user.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(result, "Wishlist fetched successfully")
    );
  }
);

export const removeFromWishlist = asyncHandler(
  async (req: Request<WishlistParams>, res: Response) => {
    await removeFromWishlistService(
      req.user.id,
      req.params.productId
    );

    res.status(200).json(
      apiResponse(
        null,
        "Product removed from wishlist"
      )
    );
  }
);

export const updateWishlistVisibility = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await updateWishlistVisibilityService(
      req.user.id,
      req.body.visibility
    );

    res.status(200).json(
      apiResponse(result, "Wishlist visibility updated")
    );
  }
);

export const getUserWishlist = asyncHandler(
  async (req: Request<IdentifierParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 12, 50);

    const result = await getUserWishlistService(
      req.params.identifier,
      req.user?.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(result, "Wishlist fetched successfully")
    );
  }
);
