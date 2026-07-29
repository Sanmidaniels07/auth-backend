import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { savedCardIdSchema } from "./payment-method.validation";
import {
  listSavedCards,
  deleteSavedCard,
  setDefaultSavedCard,
} from "./payment-method.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", listSavedCards);

router.patch(
  "/:id/default",
  validate(savedCardIdSchema),
  setDefaultSavedCard
);

router.delete(
  "/:id",
  validate(savedCardIdSchema),
  deleteSavedCard
);

export default router;
