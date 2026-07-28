import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  recentOrdersSchema,
  inventorySnapshotSchema,
  salesOverviewSchema,
  topProductsSchema,
  sellerCustomersSchema,
} from "./dashboard.validation";
import {
  getDashboardStats,
  getRecentOrders,
  getInventorySnapshot,
  getSalesOverview,
  getTopProducts,
  getAnalytics,
  getSellerCustomers,
} from "./dashboard.controller";

const router = Router();

router.use(authMiddleware);

router.get("/stats", getDashboardStats);

router.get(
  "/recent-orders",
  validate(recentOrdersSchema),
  getRecentOrders
);

router.get(
  "/inventory",
  validate(inventorySnapshotSchema),
  getInventorySnapshot
);

router.get(
  "/sales-overview",
  validate(salesOverviewSchema),
  getSalesOverview
);

router.get(
  "/top-products",
  validate(topProductsSchema),
  getTopProducts
);

router.get("/analytics", getAnalytics);

router.get(
  "/customers",
  validate(sellerCustomersSchema),
  getSellerCustomers
);

export default router;
