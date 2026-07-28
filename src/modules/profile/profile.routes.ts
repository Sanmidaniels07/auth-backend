import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { updateProfileSchema } from "./profile.validation";
import { getProfile, updateProfile } from "./profile.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getProfile);

router.patch("/", validate(updateProfileSchema), updateProfile);

export default router;