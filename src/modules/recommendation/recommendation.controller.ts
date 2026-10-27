import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  getBestSellersService,
  getForYouService,
  getRecentlyViewedService,
  getTrendingProductsService,
  recordProductViewService,
} from "./recommendation.service";

const MAX_LIMIT = 24;

const readLimit = (req: Request, fallback: number) =>
  Math.min(Number(req.query.limit) || fallback, MAX_LIMIT);

export const getTrendingProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const products = await getTrendingProductsService(readLimit(req, 8));

    res.status(200).json(
      apiResponse(products, "Trending products fetched successfully")
    );
  }
);

export const getBestSellers = asyncHandler(
  async (req: Request, res: Response) => {
    const products = await getBestSellersService(readLimit(req, 8), req.query.category as string | undefined);

    res.status(200).json(
      apiResponse(products, "Best sellers fetched successfully")
    );
  }
);

export const getForYou = asyncHandler(
  async (req: Request, res: Response) => {
    const products = await getForYouService(req.user.id, readLimit(req, 12));

    res.status(200).json(
      apiResponse(products, "Recommendations fetched successfully")
    );
  }
);

export const recordProductView = asyncHandler(
  async (req: Request, res: Response) => {
    await recordProductViewService(req.user.id, req.body.productId);

    res.status(200).json(
      apiResponse(null, "View recorded")
    );
  }
);

export const getRecentlyViewed = asyncHandler(
  async (req: Request, res: Response) => {
    const products = await getRecentlyViewedService(req.user.id, readLimit(req, 12));

    res.status(200).json(
      apiResponse(products, "Recently viewed products fetched successfully")
    );
  }
);
