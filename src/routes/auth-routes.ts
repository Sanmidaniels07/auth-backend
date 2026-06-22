import { Router } from "express";
import {
  forgotPassword,
  login,
  resetPassword,
  signup,
} from "../controllers/auth.controllers";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "../validations/auth.validation";
import { validate } from "../middleware/validate.middleware";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
