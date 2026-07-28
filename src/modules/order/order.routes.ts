import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  listOrdersSchema,
  listSellerOrdersSchema,
  updateOrderItemStatusSchema,
  updateTrackingNumberSchema,
} from "./order.validation";
import {
  getCustomerOrders,
  getCustomerOrderById,
  cancelOrder,
  getSellerOrders,
  getSellerOrderById,
  updateOrderItemStatus,
  updateOrderTrackingNumber,
} from "./order.controller";

const router = Router();

router.use(authMiddleware);

router.get(
  "/seller",
  validate(listSellerOrdersSchema),
  getSellerOrders
);

router.patch(
  "/seller/items/:orderItemId/status",
  validate(updateOrderItemStatusSchema),
  updateOrderItemStatus
);

router.patch(
  "/seller/:id/tracking-number",
  validate(updateTrackingNumberSchema),
  updateOrderTrackingNumber
);

router.get("/seller/:id", getSellerOrderById);

router.get("/", validate(listOrdersSchema), getCustomerOrders);

router.get("/:id", getCustomerOrderById);

router.patch("/:id/cancel", cancelOrder);

export default router;
