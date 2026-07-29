import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import { updateUserRoleSchema } from "./admin.validation";
import { updateUserRole } from "./admin.controller";

const router = Router();

router.use(authMiddleware, authorize("ADMIN"));

router.patch(
  "/users/:id/role",
  validate(updateUserRoleSchema),
  updateUserRole
);

export default router;
