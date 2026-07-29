import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createReviewSchema,
  updateReviewSchema,
  deleteReviewSchema,
  replyToReviewSchema,
} from "./review.validation";
import {
  createReview,
  updateReview,
  deleteReview,
  replyToReview,
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

router.post(
  "/:id/reply",
  validate(replyToReviewSchema),
  replyToReview
);

export default router;
