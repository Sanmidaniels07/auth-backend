import { Request, Response } from "express";
import { Role, UserStatus, SellerStatus } from "@prisma/client";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import {
  updateUserRoleService,
  updateUserStatusService,
  listUsersAdminService,
  listSellersAdminService,
  listProductsAdminService,
  getProductHistoryAdminService,
  setProductFeaturedAdminService,
  updateSellerStatusService,
  setSellerVerifiedService,
} from "./admin.service";

export const setSellerVerified = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const seller = await setSellerVerifiedService(
      req.params.id,
      req.body.isVerified
    );

    res.status(200).json(
      apiResponse(
        seller,
        req.body.isVerified ? "Seller business verified" : "Seller business verification removed"
      )
    );
  }
);

export const updateUserRole = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const user = await updateUserRoleService(
      req.user.id,
      req.params.id,
      req.body.role
    );

    res.status(200).json(
      apiResponse(user, "User role updated successfully")
    );
  }
);

export const updateUserStatus = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const user = await updateUserStatusService(
      req.user.id,
      req.params.id,
      req.body.status,
      req.body.reason
    );

    res.status(200).json(
      apiResponse(user, "User status updated successfully")
    );
  }
);

export const listUsersAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string;
    const role = req.query.role as Role | undefined;
    const status = req.query.status as UserStatus | undefined;

    const result = await listUsersAdminService({
      page,
      limit,
      search,
      role,
      status,
    });

    res.status(200).json(
      apiResponse(result, "Users fetched successfully")
    );
  }
);

export const listSellersAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as SellerStatus | undefined;

    const result = await listSellersAdminService(
      page,
      limit,
      status
    );

    res.status(200).json(
      apiResponse(result, "Sellers fetched successfully")
    );
  }
);

export const updateSellerStatus = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const seller = await updateSellerStatusService(
      req.params.id,
      req.body.status,
      req.body.reason
    );

    res.status(200).json(
      apiResponse(seller, "Seller status updated successfully")
    );
  }
);

export const listProductsAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = (req.query.search as string | undefined) || undefined;

    const result = await listProductsAdminService(page, limit, search);

    res.status(200).json(
      apiResponse(result, "Products fetched successfully")
    );
  }
);

export const getProductHistoryAdmin = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getProductHistoryAdminService(req.params.id, page, limit);

    res.status(200).json(
      apiResponse(result, "Product history fetched successfully")
    );
  }
);

export const setProductFeatured = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const product = await setProductFeaturedAdminService(req.params.id, req.body.isFeatured);

    res.status(200).json(
      apiResponse(product, product.isFeatured ? "Product featured" : "Product no longer featured")
    );
  }
);
