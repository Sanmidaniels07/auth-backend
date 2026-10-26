import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { stockAlertSchema, stockAlertsForProductSchema } from "./stock-alert.validation";
import { createStockAlert, deleteStockAlert, getMyStockAlertsForProduct } from "./stock-alert.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(stockAlertSchema), createStockAlert);

router.delete("/", validate(stockAlertSchema), deleteStockAlert);

router.get("/:productId", validate(stockAlertsForProductSchema), getMyStockAlertsForProduct);

export default router;
