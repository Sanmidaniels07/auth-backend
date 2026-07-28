import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createReviewSchema,
  updateReviewSchema,
  deleteReviewSchema,
} from "./review.validation";
import {
  createReview,
  updateReview,
  deleteReview,
} from "./review.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createReviewSchema), createReview);

router.patch(
  "/:id",
  validate(updateReviewSchema),
  updateReview
);

router.delete(
  "/:id",
  validate(deleteReviewSchema),
  deleteReview
);

export default router;
