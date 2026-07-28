import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { authorize } from "../../middleware/role.middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createStoreSchema,
  updateStoreSchema,
  listStoresSchema,
  storeProductsSchema,
  storeReviewsSchema,
  storeSlugSchema,
  createShippingOptionSchema,
  updateShippingOptionSchema,
  deleteShippingOptionSchema,
  adminVerifyStoreSchema,
} from "./store.validation";
import {
  createStore,
  updateStore,
  getPublicStore,
  getSellerStore,
  listStores,
  getStoreProducts,
  getStoreReviews,
  followStore,
  unfollowStore,
  getStoreFollowStatus,
  createShippingOption,
  updateShippingOption,
  deleteShippingOption,
  setStoreVerified,
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

router.patch(
  "/:id/verify",
  authMiddleware,
  authorize("ADMIN"),
  validate(adminVerifyStoreSchema),
  setStoreVerified
);

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

router.post(
  "/:slug/follow",
  authMiddleware,
  validate(storeSlugSchema),
  followStore
);

router.delete(
  "/:slug/follow",
  authMiddleware,
  validate(storeSlugSchema),
  unfollowStore
);

router.get(
  "/:slug/follow/status",
  authMiddleware,
  validate(storeSlugSchema),
  getStoreFollowStatus
);

router.post(
  "/:slug/shipping-options",
  authMiddleware,
  validate(createShippingOptionSchema),
  createShippingOption
);

router.patch(
  "/:slug/shipping-options/:optionId",
  authMiddleware,
  validate(updateShippingOptionSchema),
  updateShippingOption
);

router.delete(
  "/:slug/shipping-options/:optionId",
  authMiddleware,
  validate(deleteShippingOptionSchema),
  deleteShippingOption
);

router.get(
  "/:slug",
  optionalAuthMiddleware,
  getPublicStore
);

router.patch(
  "/:id",
  authMiddleware,
  validate(updateStoreSchema),
  updateStore
);

export default router;
