import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { readFromPushSchema, subscribeSchema, unsubscribeSchema } from "./push.validation";
import { getPushConfig, readFromPush, sendTestPush, subscribe, unsubscribe } from "./push.controller";

const router = Router();

router.get("/config", getPushConfig);
router.post("/subscriptions", authMiddleware, validate(subscribeSchema), subscribe);
router.delete("/subscriptions", authMiddleware, validate(unsubscribeSchema), unsubscribe);
router.post("/test", authMiddleware, sendTestPush);
// From the service worker: signed by the alert's token instead of a sign-in.
router.post("/read", validate(readFromPushSchema), readFromPush);

export default router;
