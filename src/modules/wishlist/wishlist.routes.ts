import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  addToWishlistSchema,
  removeFromWishlistSchema,
  getWishlistSchema,
} from "./wishlist.validation";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "./wishlist.controller";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  validate(addToWishlistSchema),
  addToWishlist
);

router.get("/", validate(getWishlistSchema), getWishlist);

router.delete(
  "/:productId",
  validate(removeFromWishlistSchema),
  removeFromWishlist
);

export default router;
