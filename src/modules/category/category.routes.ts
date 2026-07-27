import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
} from "./category.validation";
import {
  createCategory,
  getCategories,
  getFeaturedCategories,
  getPopularCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} from "./category.controller";

const router = Router();

router.post(
  "/",
  authMiddleware,
  authorize("ADMIN"),
  validate(createCategorySchema),
  createCategory
);

router.get("/", getCategories);

router.get("/featured", getFeaturedCategories);

router.get("/popular", getPopularCategories);

router.get("/:slug", getCategoryBySlug);

router.patch(
  "/:id",
  authMiddleware,
  authorize("ADMIN"),
  validate(updateCategorySchema),
  updateCategory
);

router.delete(
  "/:id",
  authMiddleware,
  authorize("ADMIN"),
  validate(deleteCategorySchema),
  deleteCategory
);

export default router;
