import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { getMyPayouts } from "./held-payout.controller";

// The seller's own payouts (GET /api/seller/payouts).
const router = Router();

router.get("/", authMiddleware, getMyPayouts);

export default router;
