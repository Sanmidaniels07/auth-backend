import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
  nearbyProductsSchema,
  relatedProductsSchema,
  productReviewsSchema,
  sellerProductsSchema,
  bulkUpdateProductStatusSchema,
  bulkDeleteProductsSchema,
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
  bulkUpdateProductStatus,
  bulkDeleteProducts,
  exportSellerProductsCsv,
} from "./product.controller";
import { aiListingDraftSchema } from "../ai-listing/ai-listing.validation";
import { createAiListingDraft, getAiListingStatus } from "../ai-listing/ai-listing.controller";

const router = Router();

// Photo-to-listing (before "/:id" so "ai-draft" isn't read as a product id).
router.get("/ai-draft/status", authMiddleware, getAiListingStatus);
router.post("/ai-draft", authMiddleware, validate(aiListingDraftSchema), createAiListingDraft);

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
  "/me/export",
  authMiddleware,
  exportSellerProductsCsv
);

router.patch(
  "/me/bulk-status",
  authMiddleware,
  validate(bulkUpdateProductStatusSchema),
  bulkUpdateProductStatus
);

router.post(
  "/me/bulk-delete",
  authMiddleware,
  validate(bulkDeleteProductsSchema),
  bulkDeleteProducts
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

router.get("/:id", optionalAuthMiddleware, getProductById);

router.patch(
  "/:id",
  authMiddleware,
  validate(updateProductSchema),
  updateProduct
);

router.delete("/:id", authMiddleware, deleteProduct);

export default router;
