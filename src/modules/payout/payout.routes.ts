import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createPayoutSchema,
  listPayoutsSchema,
} from "./payout.validation";
import {
  createPayout,
  listPayouts,
  getStorePayoutInfo,
} from "./payout.controller";

const router = Router();

router.use(authMiddleware, authorize("ADMIN"));

router.post("/", validate(createPayoutSchema), createPayout);

router.get("/", validate(listPayoutsSchema), listPayouts);

router.get("/stores/:storeId/info", getStorePayoutInfo);

export default router;
