import {
  Router
} from "express";

import {
  resendVerification,
  verifyEmail
} from "./verification.controller";
import { validate } from "../../middleware/validate.middleware";
import { resendVerificationSchema } from "./verification.validation";

const router =
  Router();

  router.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  resendVerification
);

router.get(
  "/:token",
  verifyEmail
);

export default router;