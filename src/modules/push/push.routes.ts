import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { subscribeSchema, unsubscribeSchema } from "./push.validation";
import { getPushConfig, sendTestPush, subscribe, unsubscribe } from "./push.controller";

const router = Router();

router.get("/config", getPushConfig);
router.post("/subscriptions", authMiddleware, validate(subscribeSchema), subscribe);
router.delete("/subscriptions", authMiddleware, validate(unsubscribeSchema), unsubscribe);
router.post("/test", authMiddleware, sendTestPush);

export default router;
