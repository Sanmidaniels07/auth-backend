import { Router } from "express";
import { createComment, deleteComment, getPostComments, updateComment } from "../controllers/comment.controllers";
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

router.patch(
  "/:id",
  authMiddleware,
  updateComment
);

router.delete(
  "/:id",
  authMiddleware,
  deleteComment
);

export default router;