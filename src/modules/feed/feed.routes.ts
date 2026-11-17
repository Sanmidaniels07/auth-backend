import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { feedAreaOptionsSchema, setFeedAreaSchema, shoppingFeedSchema } from "./feed.validation";
import { getFeedArea, getFeedAreaOptions, getShoppingFeed, setFeedArea } from "./feed.controller";

// The shopping feed (home), and the area its "Near me" uses.
const router = Router();

router.use(authMiddleware);

router.get("/", validate(shoppingFeedSchema), getShoppingFeed);

router.get("/area", getFeedArea);

router.put("/area", validate(setFeedAreaSchema), setFeedArea);

router.get("/area/options", validate(feedAreaOptionsSchema), getFeedAreaOptions);

export default router;
