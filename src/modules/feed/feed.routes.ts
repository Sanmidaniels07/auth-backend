import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { shoppingFeedSchema } from "./feed.validation";
import { getShoppingFeed } from "./feed.controller";

// The shopping feed (home page).
const router = Router();

router.get("/", authMiddleware, validate(shoppingFeedSchema), getShoppingFeed);

export default router;
