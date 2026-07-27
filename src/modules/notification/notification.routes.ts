import { Router } from "express";


import { authMiddleware } from "../../middleware/auth-middleware";
import { getNotifications, markNotificationRead } from "./notification.controller";


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