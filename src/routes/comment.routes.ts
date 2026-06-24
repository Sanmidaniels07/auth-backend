import { Router } from "express";
import { createComment, getPostComments } from "../controllers/comment.controllers";
import { createCommentSchema } from "../validations/comment.validation";
import { validate } from "../middleware/validate.middleware";
import { authMiddleware } from "../middleware/auth-middleware";

const router = Router();

router.post(
  "/:postId",
  authMiddleware,
  validate(createCommentSchema),
  createComment
);

router.get(
  "/post/:postId",
  getPostComments
);

export default router;