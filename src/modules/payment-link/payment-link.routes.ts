import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createPaymentLinkSchema,
  paymentLinkCodeSchema,
  paymentLinkIdSchema,
  payPaymentLinkSchema,
  updatePaymentLinkSchema,
} from "./payment-link.validation";
import {
  createPaymentLink,
  deletePaymentLink,
  getMyPaymentLinks,
  getPublicPaymentLink,
  payPaymentLink,
  updatePaymentLink,
} from "./payment-link.controller";

const router = Router();

// Seller
router.post("/", authMiddleware, validate(createPaymentLinkSchema), createPaymentLink);

router.get("/me", authMiddleware, getMyPaymentLinks);

router.patch("/:id", authMiddleware, validate(updatePaymentLinkSchema), updatePaymentLink);

router.delete("/:id", authMiddleware, validate(paymentLinkIdSchema), deletePaymentLink);

// Buyer
router.get("/:code", optionalAuthMiddleware, validate(paymentLinkCodeSchema), getPublicPaymentLink);

router.post("/:code/pay", authMiddleware, validate(payPaymentLinkSchema), payPaymentLink);

export default router;
