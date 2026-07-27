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
} from "./store.service";

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

export const getPublicStore = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    const store = await getPublicStoreService(
      req.params.slug
    );

    res.status(200).json(
      apiResponse(store, "Store fetched successfully")
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
