import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  blockUserSchema,
  listBlockedSchema,
} from "./block.validation";
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "./block.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", validate(listBlockedSchema), getBlockedUsers);

router.post(
  "/:userId",
  validate(blockUserSchema),
  blockUser
);

router.delete(
  "/:userId",
  validate(blockUserSchema),
  unblockUser
);

export default router;
