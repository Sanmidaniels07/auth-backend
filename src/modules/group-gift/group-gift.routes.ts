import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { contributeSchema, contributionReferenceSchema, groupGiftCodeSchema, startGroupGiftSchema } from "./group-gift.validation";
import { cancelGroupGift, contribute, getGroupGift, startGroupGift, verifyContribution } from "./group-gift.controller";

// Chip in on a gift.
const router = Router();

router.post("/", authMiddleware, validate(startGroupGiftSchema), startGroupGift);

// (Before /:code so "contributions" isn't read as a code.)
router.post("/contributions/:reference/verify", authMiddleware, validate(contributionReferenceSchema), verifyContribution);

router.get("/:code", optionalAuthMiddleware, validate(groupGiftCodeSchema), getGroupGift);

router.post("/:code/contribute", authMiddleware, validate(contributeSchema), contribute);

router.post("/:code/cancel", authMiddleware, validate(groupGiftCodeSchema), cancelGroupGift);

export default router;
