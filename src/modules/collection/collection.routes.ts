import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  collectionIdSchema,
  createCollectionSchema,
  publicCollectionSchema,
  updateCollectionSchema,
} from "./collection.validation";
import {
  createCollection,
  deleteCollection,
  getPublicCollection,
  listMyCollections,
  updateCollection,
} from "./collection.controller";

const router = Router();

// The seller's own collections.
router.get("/me", authMiddleware, listMyCollections);
router.post("/", authMiddleware, validate(createCollectionSchema), createCollection);
router.patch("/:id", authMiddleware, validate(updateCollectionSchema), updateCollection);
router.delete("/:id", authMiddleware, validate(collectionIdSchema), deleteCollection);

// Public: the page buyers open from nestlyapp.site/{store}/{slug}.
router.get("/:store/:slug", validate(publicCollectionSchema), getPublicCollection);

export default router;
