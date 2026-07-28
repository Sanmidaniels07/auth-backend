import { Router } from "express";

import {
  likePost,
  unlikePost,
  getPostLikes,
} from "./like.controller";

import { authMiddleware }
from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";

const router = Router();

router.post(
  "/:postId",
  authMiddleware,
  likePost
);

router.delete(
  "/:postId",
  authMiddleware,
  unlikePost
);

router.get(
  "/:postId",
  optionalAuthMiddleware,
  getPostLikes
);

export default router;