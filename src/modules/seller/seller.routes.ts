import { Router } from "express";

import {
  becomeSeller,
  getSellerProfile,
  getSellerReadiness,
  quickStartSeller,
  updateSeller,
} from "./seller.controller";
import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  becomeSellerSchema,
  quickStartSellerSchema,
  updateSellerSchema,
} from "./seller.validation";

const router = Router();

router.post(
  "/become-seller",
  authMiddleware,
  validate(becomeSellerSchema),
  becomeSeller
);

// Start selling in one step - live at once, reviewed by an admin after.
router.post("/quick-start", authMiddleware, validate(quickStartSellerSchema), quickStartSeller);

router.get("/me", authMiddleware, getSellerProfile);

router.get("/me/readiness", authMiddleware, getSellerReadiness);

router.patch(
  "/me",
  authMiddleware,
  validate(updateSellerSchema),
  updateSeller
);

export default router;