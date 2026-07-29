import { Request, Response } from "express";
import { ProductCondition, ProductStatus } from "@prisma/client";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import { getProductReviewsService } from "../review/review.service";
import {
  createProductService,
  updateProductService,
  archiveProductService,
  getProductsService,
  getPublicProductByIdService,
  getFeaturedProductsService,
  getNearbyProductsService,
  getRelatedProductsService,
  getSellerProductsService,
  getSellerProductByIdService,
  bulkUpdateProductStatusService,
  bulkDeleteProductsService,
  exportSellerProductsCsvService,
} from "./product.service";

export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await createProductService(
      req.user.id,
      req.body
    );

    res.status(201).json(
      apiResponse(product, "Product created successfully")
    );
  }
);

export const getProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const minPrice = req.query.minPrice
      ? Number(req.query.minPrice)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? Number(req.query.maxPrice)
      : undefined;
    const condition = req.query.condition as
      | ProductCondition
      | undefined;
    const brand = req.query.brand as string;
    const sort = req.query.sort as string;

    const result = await getProductsService({
      page,
      limit,
      search,
      category,
      minPrice,
      maxPrice,
      condition,
      brand,
      sort,
    });

    res.status(200).json(
      apiResponse(result, "Products fetched successfully")
    );
  }
);

export const getFeaturedProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 8;

    const products = await getFeaturedProductsService(
      limit
    );

    res.status(200).json(
      apiResponse(
        products,
        "Featured products fetched successfully"
      )
    );
  }
);

export const getNearbyProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const city = req.query.city as string;
    const state = req.query.state as string;

    const result = await getNearbyProductsService(
      city,
      state,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Nearby products fetched successfully"
      )
    );
  }
);

export const getSellerProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const status = req.query.status as
      | ProductStatus
      | undefined;

    const result = await getSellerProductsService(
      req.user.id,
      page,
      limit,
      status
    );

    res.status(200).json(
      apiResponse(
        result,
        "Your products fetched successfully"
      )
    );
  }
);

export const bulkUpdateProductStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await bulkUpdateProductStatusService(
      req.user.id,
      req.body.productIds,
      req.body.status
    );

    res.status(200).json(
      apiResponse(result, "Products updated successfully")
    );
  }
);

export const bulkDeleteProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await bulkDeleteProductsService(
      req.user.id,
      req.body.productIds
    );

    res.status(200).json(
      apiResponse(result, "Products archived successfully")
    );
  }
);

export const exportSellerProductsCsv = asyncHandler(
  async (req: Request, res: Response) => {
    const csv = await exportSellerProductsCsvService(
      req.user.id
    );

    res.status(200);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="products.csv"'
    );
    res.send(csv);
  }
);

export const getSellerProductById = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const product = await getSellerProductByIdService(
      req.user.id,
      req.params.id
    );

    res.status(200).json(
      apiResponse(product, "Product fetched successfully")
    );
  }
);

export const getRelatedProducts = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const limit = Number(req.query.limit) || 8;

    const products = await getRelatedProductsService(
      req.params.id,
      limit
    );

    res.status(200).json(
      apiResponse(
        products,
        "Related products fetched successfully"
      )
    );
  }
);

export const getProductReviews = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await getProductReviewsService(
      req.params.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Product reviews fetched successfully"
      )
    );
  }
);

export const getProductById = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const product = await getPublicProductByIdService(
      req.params.id
    );

    res.status(200).json(
      apiResponse(product, "Product fetched successfully")
    );
  }
);

export const updateProduct = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const product = await updateProductService(
      req.user.id,
      req.params.id,
      req.body
    );

    res.status(200).json(
      apiResponse(product, "Product updated successfully")
    );
  }
);

export const deleteProduct = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await archiveProductService(
      req.user.id,
      req.params.id
    );

    res.status(200).json(
      apiResponse(null, "Product archived successfully")
    );
  }
);
