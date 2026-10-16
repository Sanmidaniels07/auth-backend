import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { userDashboardSchema } from "./user-dashboard.validation";
import { getUserDashboard } from "./user-dashboard.controller";

const router = Router();

router.get("/", authMiddleware, validate(userDashboardSchema), getUserDashboard);

export default router;
