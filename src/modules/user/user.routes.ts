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

export default router;