import { Router } from "express";

import {
  getNotifications,
  markNotificationRead,
} from "../controllers/notification.controllers";

import { authMiddleware } from "../middleware/auth-middleware";

const router = Router();

router.get(
  "/",
  authMiddleware,
  getNotifications
);

router.patch(
  "/:id/read",
  authMiddleware,
  markNotificationRead
);

export default router;