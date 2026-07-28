import { Router } from "express";
import { createComment, deleteComment, getPostComments, updateComment } from "./comment.controller";
import { createCommentSchema, updateCommentSchema, deleteCommentSchema } from "./comment.validation";
import { validate } from "../../middleware/validate.middleware";
import { authMiddleware } from "../../middleware/auth-middleware";

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
  validate(updateCommentSchema),
  updateComment
);

router.delete(
  "/:id",
  authMiddleware,
  validate(deleteCommentSchema),
  deleteComment
);

export default router;