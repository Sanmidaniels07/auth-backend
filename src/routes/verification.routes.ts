import {
  Router
} from "express";

import {
  resendVerification,
  verifyEmail
} from "../controllers/verification.controllers";
import { validate } from "../middleware/validate.middleware";
import { resendVerificationSchema } from "../validations/verification.validation";

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