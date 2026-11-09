import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { claimGiftSchema, giftCodeSchema, listGiftsSchema, sendGiftSchema } from "./gift.validation";
import { cancelGift, claimGift, declineGift, getGift, listGifts, sendGift } from "./gift.controller";

const router = Router();

// Send a gift (starts the Paystack payment).
router.post("/", authMiddleware, validate(sendGiftSchema), sendGift);

// Gifts you sent (?box=sent) or received (?box=received).
router.get("/", authMiddleware, validate(listGiftsSchema), listGifts);

// The gift page - public, so the link can be opened before signing in.
router.get("/:code", optionalAuthMiddleware, validate(giftCodeSchema), getGift);

// The recipient accepts it and adds their delivery address.
router.post("/:code/claim", authMiddleware, validate(claimGiftSchema), claimGift);

// The recipient says no thanks (sender refunded).
router.post("/:code/decline", authMiddleware, validate(giftCodeSchema), declineGift);

// The sender cancels before it's accepted (refunded).
router.post("/:code/cancel", authMiddleware, validate(giftCodeSchema), cancelGift);

export default router;
