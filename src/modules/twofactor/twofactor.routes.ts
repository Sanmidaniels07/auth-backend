import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  verifyTwoFactorSetupSchema,
  disableTwoFactorSchema,
  loginTwoFactorSchema,
} from "./twofactor.validation";
import {
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
  loginWithTwoFactor,
} from "./twofactor.controller";

const router = Router();

// No authMiddleware - the requester only has a short-lived twoFactorToken
// from step one of login, not a full session yet.
router.post(
  "/login",
  validate(loginTwoFactorSchema),
  loginWithTwoFactor
);

router.post("/setup", authMiddleware, setupTwoFactor);

router.post(
  "/verify",
  authMiddleware,
  validate(verifyTwoFactorSetupSchema),
  verifyTwoFactorSetup
);

router.post(
  "/disable",
  authMiddleware,
  validate(disableTwoFactorSchema),
  disableTwoFactor
);

export default router;