import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  listOrdersSchema,
  listSellerOrdersSchema,
  updateOrderItemStatusSchema,
  updateTrackingNumberSchema,
  confirmDeliverySchema,
} from "./order.validation";
import {
  getCustomerOrders,
  getCustomerOrderById,
  cancelOrder,
  getSellerOrders,
  getSellerOrderById,
  updateOrderItemStatus,
  updateOrderTrackingNumber,
  confirmDelivery,
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

// Buyer confirms they received an item the seller marked delivered.
router.post(
  "/items/:orderItemId/confirm-delivery",
  validate(confirmDeliverySchema),
  confirmDelivery
);

export default router;
