import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import {
  createPaymentLinkSchema,
  guestClaimAccountSchema,
  guestConfirmDeliverySchema,
  guestOrderTokenSchema,
  guestPayPaymentLinkSchema,
  paymentLinkCodeSchema,
  paymentLinkIdSchema,
  payPaymentLinkSchema,
  updatePaymentLinkSchema,
} from "./payment-link.validation";
import {
  claimGuestAccount,
  confirmGuestDelivery,
  createPaymentLink,
  deletePaymentLink,
  getGuestOrder,
  getMyPaymentLinks,
  getPublicPaymentLink,
  guestPayPaymentLink,
  payPaymentLink,
  updatePaymentLink,
  verifyGuestOrder,
} from "./payment-link.controller";

const router = Router();

// Seller
router.post("/", authMiddleware, validate(createPaymentLinkSchema), createPaymentLink);

router.get("/me", authMiddleware, getMyPaymentLinks);

router.patch("/:id", authMiddleware, validate(updatePaymentLinkSchema), updatePaymentLink);

router.delete("/:id", authMiddleware, validate(paymentLinkIdSchema), deletePaymentLink);

// Guest checkout - no login. The order's secret token is the access.
// (Before /:code so "guest-orders" isn't read as a link code.)
const guestLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: "Too many attempts. Please wait a few minutes and try again.",
});
const guestPayLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: "Too many payment attempts. Please wait a few minutes and try again.",
});

router.get("/guest-orders/:token", guestLimit, validate(guestOrderTokenSchema), getGuestOrder);

router.post("/guest-orders/:token/verify", guestLimit, validate(guestOrderTokenSchema), verifyGuestOrder);

router.post(
  "/guest-orders/:token/items/:orderItemId/confirm-delivery",
  guestLimit,
  validate(guestConfirmDeliverySchema),
  confirmGuestDelivery
);

router.post("/guest-orders/:token/claim", guestLimit, validate(guestClaimAccountSchema), claimGuestAccount);

// Buyer
router.get("/:code", optionalAuthMiddleware, validate(paymentLinkCodeSchema), getPublicPaymentLink);

router.post("/:code/pay", authMiddleware, validate(payPaymentLinkSchema), payPaymentLink);

router.post("/:code/guest-pay", guestPayLimit, validate(guestPayPaymentLinkSchema), guestPayPaymentLink);

export default router;
