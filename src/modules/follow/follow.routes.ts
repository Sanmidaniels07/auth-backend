import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  followParamsSchema,
  listFollowSchema,
  removeFollowerSchema,
} from "./follow.validation";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  removeFollower,
} from "./follow.controller";

const router = Router();

// Remove someone from your own followers.
router.delete(
  "/followers/:userId",
  authMiddleware,
  validate(removeFollowerSchema),
  removeFollower
);

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