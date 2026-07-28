import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { ProductParams } from "../../types/request.types";
import {
  getCartService,
  addToCartService,
  updateCartItemService,
  removeCartItemService,
} from "./cart.service";

export const getCart = asyncHandler(
  async (req: Request, res: Response) => {
    const cart = await getCartService(req.user.id);

    res.status(200).json(
      apiResponse(cart, "Cart fetched successfully")
    );
  }
);

export const addToCart = asyncHandler(
  async (req: Request, res: Response) => {
    const quantity = req.body.quantity ?? 1;

    const item = await addToCartService(
      req.user.id,
      req.body.productId,
      quantity
    );

    res.status(201).json(
      apiResponse(item, "Product added to cart")
    );
  }
);

export const updateCartItem = asyncHandler(
  async (req: Request<ProductParams>, res: Response) => {
    const item = await updateCartItemService(
      req.user.id,
      req.params.productId,
      req.body.quantity
    );

    res.status(200).json(
      apiResponse(item, "Cart item updated successfully")
    );
  }
);

export const removeCartItem = asyncHandler(
  async (req: Request<ProductParams>, res: Response) => {
    await removeCartItemService(
      req.user.id,
      req.params.productId
    );

    res.status(200).json(
      apiResponse(null, "Product removed from cart")
    );
  }
);
