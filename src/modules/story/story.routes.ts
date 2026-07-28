import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createStorySchema,
  storyIdSchema,
  storyViewersSchema,
  reactToStorySchema,
} from "./story.validation";
import {
  createStory,
  getStoriesFeed,
  getStoryById,
  deleteStory,
  getStoryViewers,
  reactToStory,
  removeStoryReaction,
} from "./story.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createStorySchema), createStory);

router.get("/", getStoriesFeed);

router.get(
  "/:id/viewers",
  validate(storyViewersSchema),
  getStoryViewers
);

router.post(
  "/:id/react",
  validate(reactToStorySchema),
  reactToStory
);

router.delete(
  "/:id/react",
  validate(storyIdSchema),
  removeStoryReaction
);

router.get("/:id", validate(storyIdSchema), getStoryById);

router.delete("/:id", validate(storyIdSchema), deleteStory);

export default router;
