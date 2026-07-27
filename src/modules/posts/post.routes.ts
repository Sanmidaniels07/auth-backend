import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { createPostSchema } from "./post.validations";
import { authMiddleware } from "../../middleware/auth-middleware";
import { createPost, deletePost, getDeletedPosts, getPosts, getSinglePost, restorePost, updatePost } from "./post.controller";


const router = Router();

router.post(
  "/",
  authMiddleware,
  validate(createPostSchema),
  createPost
);

router.get("/", getPosts);

router.get(
  "/deleted",
  authMiddleware,
  getDeletedPosts
);

router.get("/:id", getSinglePost);

router.patch(
  "/:id",
  authMiddleware,
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