import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  initiateCheckoutSchema,
  checkoutWithSavedCardSchema,
  verifyCheckoutSchema,
} from "./checkout.validation";
import {
  initiateCheckout,
  checkoutWithSavedCard,
  verifyCheckout,
  paystackWebhook,
} from "./checkout.controller";

const router = Router();

// No authMiddleware - Paystack calls this directly and is authenticated via signature.
router.post("/webhook/paystack", paystackWebhook);

router.post(
  "/initiate",
  authMiddleware,
  validate(initiateCheckoutSchema),
  initiateCheckout
);

router.post(
  "/charge-saved-card",
  authMiddleware,
  validate(checkoutWithSavedCardSchema),
  checkoutWithSavedCard
);

router.get(
  "/verify/:reference",
  authMiddleware,
  validate(verifyCheckoutSchema),
  verifyCheckout
);

export default router;
