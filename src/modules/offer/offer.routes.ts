import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { createOfferSchema, offerIdSchema, respondOfferSchema } from "./offer.validation";
import { createOffer, respondOffer, withdrawOffer } from "./offer.controller";

// Make an offer in chat.
const router = Router();

router.use(authMiddleware);

router.post("/", validate(createOfferSchema), createOffer);

router.post("/:id/respond", validate(respondOfferSchema), respondOffer);

router.post("/:id/withdraw", validate(offerIdSchema), withdrawOffer);

export default router;
