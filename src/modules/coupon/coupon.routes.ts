import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createCouponSchema,
  updateCouponSchema,
  listCouponsSchema,
  validateCouponSchema,
} from "./coupon.validation";
import {
  createCoupon,
  listCoupons,
  updateCoupon,
  validateCoupon,
} from "./coupon.controller";

const router = Router();

router.use(authMiddleware);

router.post(
  "/validate",
  validate(validateCouponSchema),
  validateCoupon
);

router.post(
  "/",
  authorize("ADMIN"),
  validate(createCouponSchema),
  createCoupon
);

router.get(
  "/",
  authorize("ADMIN"),
  validate(listCouponsSchema),
  listCoupons
);

router.patch(
  "/:id",
  authorize("ADMIN"),
  validate(updateCouponSchema),
  updateCoupon
);

export default router;
