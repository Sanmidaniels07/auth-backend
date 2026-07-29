import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  getDashboardStatsService,
  getRecentOrdersService,
  getInventorySnapshotService,
  getSalesOverviewService,
  getTopProductsService,
  getAnalyticsService,
  getSellerCustomersService,
  getSellerEarningsService,
  getSellerPayoutsService,
  getStoreTrafficService,
} from "./dashboard.service";

export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await getDashboardStatsService(
      req.user.id
    );

    res.status(200).json(
      apiResponse(
        stats,
        "Dashboard stats fetched successfully"
      )
    );
  }
);

export const getRecentOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 10;

    const orders = await getRecentOrdersService(
      req.user.id,
      limit
    );

    res.status(200).json(
      apiResponse(
        orders,
        "Recent orders fetched successfully"
      )
    );
  }
);

export const getInventorySnapshot = asyncHandler(
  async (req: Request, res: Response) => {
    const threshold = Number(req.query.threshold) || 5;

    const snapshot = await getInventorySnapshotService(
      req.user.id,
      threshold
    );

    res.status(200).json(
      apiResponse(
        snapshot,
        "Inventory snapshot fetched successfully"
      )
    );
  }
);

export const getSalesOverview = asyncHandler(
  async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;

    const overview = await getSalesOverviewService(
      req.user.id,
      days
    );

    res.status(200).json(
      apiResponse(
        overview,
        "Sales overview fetched successfully"
      )
    );
  }
);

export const getTopProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 5;

    const products = await getTopProductsService(
      req.user.id,
      limit
    );

    res.status(200).json(
      apiResponse(
        products,
        "Top products fetched successfully"
      )
    );
  }
);

export const getSellerCustomers = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getSellerCustomersService(
      req.user.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Customers fetched successfully"
      )
    );
  }
);

export const getAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const analytics = await getAnalyticsService(
      req.user.id
    );

    res.status(200).json(
      apiResponse(
        analytics,
        "Analytics fetched successfully"
      )
    );
  }
);

export const getSellerEarnings = asyncHandler(
  async (req: Request, res: Response) => {
    const earnings = await getSellerEarningsService(
      req.user.id
    );

    res.status(200).json(
      apiResponse(
        earnings,
        "Earnings fetched successfully"
      )
    );
  }
);

export const getStoreTraffic = asyncHandler(
  async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;

    const traffic = await getStoreTrafficService(
      req.user.id,
      days
    );

    res.status(200).json(
      apiResponse(
        traffic,
        "Store traffic fetched successfully"
      )
    );
  }
);

export const getSellerPayouts = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getSellerPayoutsService(
      req.user.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Payouts fetched successfully"
      )
    );
  }
);
