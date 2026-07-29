import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  updatePreferenceSchema,
  registerPushTokenSchema,
  unregisterPushTokenSchema,
} from "./notification.validation";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreference,
  registerPushToken,
  unregisterPushToken,
} from "./notification.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getNotifications);

router.patch("/read-all", markAllNotificationsRead);

router.patch("/:id/read", markNotificationRead);

router.get("/preferences", getNotificationPreferences);

router.patch(
  "/preferences",
  validate(updatePreferenceSchema),
  updateNotificationPreference
);

router.post(
  "/push-tokens",
  validate(registerPushTokenSchema),
  registerPushToken
);

router.delete(
  "/push-tokens/:token",
  validate(unregisterPushTokenSchema),
  unregisterPushToken
);

export default router;
