import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createStoreSchema,
  updateStoreSchema,
  listStoresSchema,
  storeProductsSchema,
  storeReviewsSchema,
} from "./store.validation";
import {
  createStore,
  updateStore,
  getPublicStore,
  getSellerStore,
  listStores,
  getStoreProducts,
  getStoreReviews,
} from "./store.controller";

const router = Router();

router.post(
  "/",
  authMiddleware,
  validate(createStoreSchema),
  createStore
);

router.get("/", validate(listStoresSchema), listStores);

router.get("/me", authMiddleware, getSellerStore);

router.get(
  "/:slug/products",
  validate(storeProductsSchema),
  getStoreProducts
);

router.get(
  "/:slug/reviews",
  validate(storeReviewsSchema),
  getStoreReviews
);

router.get("/:slug", getPublicStore);

router.patch(
  "/:id",
  authMiddleware,
  validate(updateStoreSchema),
  updateStore
);

export default router;
