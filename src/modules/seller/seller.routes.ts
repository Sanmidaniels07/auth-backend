import { Router } from "express";

import {
  becomeSeller,
  getSellerProfile,
  getSellerReadiness,
  updateSeller,
} from "./seller.controller";
import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  becomeSellerSchema,
  updateSellerSchema,
} from "./seller.validation";

const router = Router();

router.post(
  "/become-seller",
  authMiddleware,
  validate(becomeSellerSchema),
  becomeSeller
);

router.get("/me", authMiddleware, getSellerProfile);

router.get("/me/readiness", authMiddleware, getSellerReadiness);

router.patch(
  "/me",
  authMiddleware,
  validate(updateSellerSchema),
  updateSeller
);

export default router;