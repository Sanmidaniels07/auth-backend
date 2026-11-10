import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  listUsersSchema,
  suggestedUsersSchema,
  getUserProfileSchema,
} from "./user.validation";
import {
  getUsers,
  getSuggestedUsers,
  getUserProfile,
} from "./user.controller";
import { getUserWishlistSchema } from "../wishlist/wishlist.validation";
import { getUserWishlist } from "../wishlist/wishlist.controller";

const router = Router();

router.get(
  "/",
  optionalAuthMiddleware,
  validate(listUsersSchema),
  getUsers
);

router.get(
  "/suggested",
  authMiddleware,
  validate(suggestedUsersSchema),
  getSuggestedUsers
);

router.get(
  "/:identifier",
  optionalAuthMiddleware,
  validate(getUserProfileSchema),
  getUserProfile
);

// Someone else's wishlist (gift ideas) - only if they share it with the viewer.
router.get(
  "/:identifier/wishlist",
  optionalAuthMiddleware,
  validate(getUserWishlistSchema),
  getUserWishlist
);

export default router;