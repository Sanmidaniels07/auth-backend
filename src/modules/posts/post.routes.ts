import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { createPostSchema, updatePostSchema } from "./post.validations";
import { authMiddleware } from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { createPost, deletePost, getDeletedPosts, getPosts, getSinglePost, restorePost, updatePost } from "./post.controller";


const router = Router();

router.post(
  "/",
  authMiddleware,
  validate(createPostSchema),
  createPost
);

router.get("/", optionalAuthMiddleware, getPosts);

router.get(
  "/deleted",
  authMiddleware,
  getDeletedPosts
);

router.get("/:id", optionalAuthMiddleware, getSinglePost);

router.patch(
  "/:id",
  authMiddleware,
  validate(updatePostSchema),
  updatePost
);


router.delete(
  "/:id",
  authMiddleware,
  deletePost
);

router.patch(
  "/restore/:id",
  authMiddleware,
  restorePost
);



export default router;