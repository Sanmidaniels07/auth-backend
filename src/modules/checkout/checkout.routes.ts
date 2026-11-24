import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  initiateCheckoutSchema,
  checkoutWithSavedCardSchema,
  verifyCheckoutSchema,
  guestCartQuoteSchema,
  guestCheckoutSchema,
} from "./checkout.validation";
import {
  initiateCheckout,
  checkoutWithSavedCard,
  verifyCheckout,
  paystackWebhook,
  guestCartQuote,
  guestCheckout,
} from "./checkout.controller";
import { rateLimit } from "../../middleware/rate-limit.middleware";

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

// Guest checkout (shop cart / Buy now without an account). The order is
// followed through the guest-order routes under /api/payment-links.
const guestQuoteLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  message: "Too many requests. Please wait a few minutes and try again.",
});
const guestCheckoutLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: "Too many payment attempts. Please wait a few minutes and try again.",
});

router.post("/guest/quote", guestQuoteLimit, validate(guestCartQuoteSchema), guestCartQuote);

router.post("/guest", guestCheckoutLimit, validate(guestCheckoutSchema), guestCheckout);

export default router;
