import { Router } from "express";

import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  quickSearchSchema,
  searchByTypeSchema,
} from "./search.validation";
import { quickSearch, searchByType } from "./search.controller";

const router = Router();

router.get(
  "/",
  optionalAuthMiddleware,
  validate(quickSearchSchema),
  quickSearch
);

router.get(
  "/:type",
  optionalAuthMiddleware,
  validate(searchByTypeSchema),
  searchByType
);

export default router;
