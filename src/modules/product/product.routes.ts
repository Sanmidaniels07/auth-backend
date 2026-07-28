import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
  nearbyProductsSchema,
  relatedProductsSchema,
  productReviewsSchema,
  sellerProductsSchema,
} from "./product.validation";
import {
  createProduct,
  getProducts,
  getFeaturedProducts,
  getNearbyProducts,
  getSellerProducts,
  getSellerProductById,
  getRelatedProducts,
  getProductReviews,
  getProductById,
  updateProduct,
  deleteProduct,
} from "./product.controller";

const router = Router();

router.post(
  "/",
  authMiddleware,
  validate(createProductSchema),
  createProduct
);

router.get("/", validate(listProductsSchema), getProducts);

router.get("/featured", getFeaturedProducts);

router.get(
  "/nearby",
  validate(nearbyProductsSchema),
  getNearbyProducts
);

router.get(
  "/me",
  authMiddleware,
  validate(sellerProductsSchema),
  getSellerProducts
);

router.get(
  "/me/:id",
  authMiddleware,
  getSellerProductById
);

router.get(
  "/:id/related",
  validate(relatedProductsSchema),
  getRelatedProducts
);

router.get(
  "/:id/reviews",
  validate(productReviewsSchema),
  getProductReviews
);

router.get("/:id", getProductById);

router.patch(
  "/:id",
  authMiddleware,
  validate(updateProductSchema),
  updateProduct
);

router.delete("/:id", authMiddleware, deleteProduct);

export default router;
