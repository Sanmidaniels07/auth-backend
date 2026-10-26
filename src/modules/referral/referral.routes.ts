import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { recordReferralVisitSchema } from "./referral.validation";
import { getMyReferralStats, recordReferralVisit } from "./referral.controller";

const router = Router();

// Public - the website calls this when someone opens a ?ref= link.
router.post("/visit", validate(recordReferralVisitSchema), recordReferralVisit);

// The seller's code and what their links have brought in.
router.get("/me", authMiddleware, getMyReferralStats);

export default router;
