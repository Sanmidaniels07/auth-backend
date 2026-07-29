import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  changePasswordSchema,
  deleteAccountSchema,
  revokeSessionSchema,
} from "./account.validation";
import {
  changePassword,
  deleteAccount,
  listSessions,
  revokeSession,
  revokeOtherSessions,
} from "./account.controller";

const router = Router();

router.use(authMiddleware);

router.patch(
  "/password",
  validate(changePasswordSchema),
  changePassword
);

router.delete(
  "/",
  validate(deleteAccountSchema),
  deleteAccount
);

router.get("/sessions", listSessions);

router.delete("/sessions/others", revokeOtherSessions);

router.delete(
  "/sessions/:id",
  validate(revokeSessionSchema),
  revokeSession
);

export default router;