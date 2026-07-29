import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  updateUserRoleSchema,
  updateUserStatusSchema,
  listUsersAdminSchema,
} from "./admin.validation";
import {
  updateUserRole,
  updateUserStatus,
  listUsersAdmin,
} from "./admin.controller";

const router = Router();

router.use(authMiddleware, authorize("ADMIN"));

router.get(
  "/users",
  validate(listUsersAdminSchema),
  listUsersAdmin
);

router.patch(
  "/users/:id/role",
  validate(updateUserRoleSchema),
  updateUserRole
);

router.patch(
  "/users/:id/status",
  validate(updateUserStatusSchema),
  updateUserStatus
);

export default router;
