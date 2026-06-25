import { Router } from "express";

import {
  likePost,
  unlikePost,
  getPostLikes,
} from "../controllers/like.controllers";

import { authMiddleware }
from "../middleware/auth-middleware";

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
  getPostLikes
);

export default router;