import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  IdParams,
  SlugParams,
} from "../../types/request.types";
import {
  createStoreService,
  updateStoreService,
  getPublicStoreService,
  getSellerStoreService,
  listStoresService,
  getStoreProductsService,
  followStoreService,
  unfollowStoreService,
  getStoreFollowStatusService,
  createShippingOptionService,
  updateShippingOptionService,
  deleteShippingOptionService,
  setStoreVerifiedService,
  setupPayoutAccountService,
} from "./store.service";

interface ShippingOptionParams {
  slug: string;
  optionId: string;
}
import { getStoreReviewsService } from "../review/review.service";

export const createStore = asyncHandler(
  async (req: Request, res: Response) => {
    const store = await createStoreService(
      req.user.id,
      req.body
    );

    res.status(201).json(
      apiResponse(store, "Store created successfully")
    );
  }
);

export const updateStore = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const store = await updateStoreService(
      req.user.id,
      req.params.id,
      req.body
    );

    res.status(200).json(
      apiResponse(store, "Store updated successfully")
    );
  }
);

export const setupPayoutAccount = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    const store = await setupPayoutAccountService(
      req.user.id,
      req.params.slug,
      req.body.bankCode,
      req.body.accountNumber
    );

    res.status(200).json(
      apiResponse(store, "Payout account set up successfully")
    );
  }
);

export const getPublicStore = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    const store = await getPublicStoreService(
      req.params.slug,
      req.user?.id
    );

    res.status(200).json(
      apiResponse(store, "Store fetched successfully")
    );
  }
);

export const followStore = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    const follow = await followStoreService(
      req.user.id,
      req.params.slug
    );

    res.status(201).json(
      apiResponse(follow, "Store followed successfully")
    );
  }
);

export const unfollowStore = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    await unfollowStoreService(req.user.id, req.params.slug);

    res.status(200).json(
      apiResponse(null, "Store unfollowed successfully")
    );
  }
);

export const getStoreFollowStatus = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    const result = await getStoreFollowStatusService(
      req.user.id,
      req.params.slug
    );

    res.status(200).json(
      apiResponse(
        result,
        "Store follow status fetched successfully"
      )
    );
  }
);

export const getSellerStore = asyncHandler(
  async (req: Request, res: Response) => {
    const store = await getSellerStoreService(
      req.user.id
    );

    res.status(200).json(
      apiResponse(store, "Store fetched successfully")
    );
  }
);

export const listStores = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string;
    const city = req.query.city as string;

    const result = await listStoresService(
      page,
      limit,
      search,
      city
    );

    res.status(200).json(
      apiResponse(result, "Stores fetched successfully")
    );
  }
);

export const getStoreReviews = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await getStoreReviewsService(
      req.params.slug,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Store reviews fetched successfully"
      )
    );
  }
);

export const getStoreProducts = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await getStoreProductsService(
      req.params.slug,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Store products fetched successfully"
      )
    );
  }
);

export const createShippingOption = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    const option = await createShippingOptionService(
      req.user.id,
      req.params.slug,
      req.body
    );

    res.status(201).json(
      apiResponse(
        option,
        "Shipping option created successfully"
      )
    );
  }
);

export const updateShippingOption = asyncHandler(
  async (
    req: Request<ShippingOptionParams>,
    res: Response
  ) => {
    const option = await updateShippingOptionService(
      req.user.id,
      req.params.slug,
      req.params.optionId,
      req.body
    );

    res.status(200).json(
      apiResponse(
        option,
        "Shipping option updated successfully"
      )
    );
  }
);

export const deleteShippingOption = asyncHandler(
  async (
    req: Request<ShippingOptionParams>,
    res: Response
  ) => {
    await deleteShippingOptionService(
      req.user.id,
      req.params.slug,
      req.params.optionId
    );

    res.status(200).json(
      apiResponse(
        null,
        "Shipping option deleted successfully"
      )
    );
  }
);

export const setStoreVerified = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const store = await setStoreVerifiedService(
      req.params.id,
      req.body.isVerified
    );

    res.status(200).json(
      apiResponse(
        store,
        "Store verification status updated successfully"
      )
    );
  }
);
