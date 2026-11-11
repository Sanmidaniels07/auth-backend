import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createPayoutSchema,
  listPayoutsSchema,
  payHeldManuallySchema,
} from "./payout.validation";
import {
  createPayout,
  listPayouts,
  getStorePayoutInfo,
} from "./payout.controller";
import { getHeldPayoutsOverview, payHeldManually, runHeldPayouts } from "./held-payout.controller";

const router = Router();

router.use(authMiddleware, authorize("ADMIN"));

router.post("/", validate(createPayoutSchema), createPayout);

router.get("/", validate(listPayoutsSchema), listPayouts);

router.get("/stores/:storeId/info", getStorePayoutInfo);

// Hold-then-pay: money held per seller, pay a seller's ready orders by hand,
// and run payouts now.
router.get("/held", getHeldPayoutsOverview);
router.post("/held/:storeId/pay", validate(payHeldManuallySchema), payHeldManually);
router.post("/run", runHeldPayouts);

export default router;
