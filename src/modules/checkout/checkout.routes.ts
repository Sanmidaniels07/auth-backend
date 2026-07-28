import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  initiateCheckoutSchema,
  verifyCheckoutSchema,
} from "./checkout.validation";
import {
  initiateCheckout,
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

router.get(
  "/verify/:reference",
  authMiddleware,
  validate(verifyCheckoutSchema),
  verifyCheckout
);

export default router;
