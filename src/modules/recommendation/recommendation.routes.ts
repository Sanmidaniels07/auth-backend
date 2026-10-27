import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { bestSellersSchema, recommendationListSchema, recordViewSchema } from "./recommendation.validation";
import {
  getBestSellers,
  getForYou,
  getRecentlyViewed,
  getTrendingProducts,
  recordProductView,
} from "./recommendation.controller";

const router = Router();

router.get("/trending", validate(recommendationListSchema), getTrendingProducts);

router.get("/best-sellers", validate(bestSellersSchema), getBestSellers);

router.get("/for-you", authMiddleware, validate(recommendationListSchema), getForYou);

router.get("/recently-viewed", authMiddleware, validate(recommendationListSchema), getRecentlyViewed);

router.post("/views", authMiddleware, validate(recordViewSchema), recordProductView);

export default router;
