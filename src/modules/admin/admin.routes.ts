import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  updateUserRoleSchema,
  updateUserStatusSchema,
  listUsersAdminSchema,
  listSellersAdminSchema,
  updateSellerStatusSchema,
  setSellerVerifiedSchema,
  listProductsAdminSchema,
  productHistoryAdminSchema,
} from "./admin.validation";
import {
  updateUserRole,
  updateUserStatus,
  listUsersAdmin,
  listSellersAdmin,
  updateSellerStatus,
  setSellerVerified,
  listProductsAdmin,
  getProductHistoryAdmin,
} from "./admin.controller";

const router = Router();

router.use(authMiddleware, authorize("ADMIN"));

router.get(
  "/users",
  validate(listUsersAdminSchema),
  listUsersAdmin
);

router.patch(
  "/users/:id/role",
  validate(updateUserRoleSchema),
  updateUserRole
);

router.patch(
  "/users/:id/status",
  validate(updateUserStatusSchema),
  updateUserStatus
);

router.get(
  "/sellers",
  validate(listSellersAdminSchema),
  listSellersAdmin
);

router.patch(
  "/sellers/:id/status",
  validate(updateSellerStatusSchema),
  updateSellerStatus
);

router.patch(
  "/sellers/:id/verify",
  validate(setSellerVerifiedSchema),
  setSellerVerified
);

router.get(
  "/products",
  validate(listProductsAdminSchema),
  listProductsAdmin
);

router.get(
  "/products/:id/history",
  validate(productHistoryAdminSchema),
  getProductHistoryAdmin
);

export default router;
