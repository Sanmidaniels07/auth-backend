import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  followParamsSchema,
  listFollowSchema,
} from "./follow.validation";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
} from "./follow.controller";

const router = Router();

router.post(
  "/:userId",
  authMiddleware,
  validate(followParamsSchema),
  followUser
);

router.delete(
  "/:userId",
  authMiddleware,
  validate(followParamsSchema),
  unfollowUser
);

router.get(
  "/:userId/status",
  authMiddleware,
  validate(followParamsSchema),
  getFollowStatus
);

router.get(
  "/:userId/followers",
  validate(listFollowSchema),
  getFollowers
);

router.get(
  "/:userId/following",
  validate(listFollowSchema),
  getFollowing
);

export default router;