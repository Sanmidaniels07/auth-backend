import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createCommunitySchema,
  listCommunitiesSchema,
  trendingCommunitiesSchema,
  communitySlugSchema,
} from "./community.validation";
import {
  createCommunity,
  listCommunities,
  getTrendingCommunities,
  getCommunityBySlug,
  joinCommunity,
  leaveCommunity,
} from "./community.controller";

const router = Router();

router.post(
  "/",
  authMiddleware,
  validate(createCommunitySchema),
  createCommunity
);

router.get(
  "/",
  validate(listCommunitiesSchema),
  listCommunities
);

router.get(
  "/trending",
  validate(trendingCommunitiesSchema),
  getTrendingCommunities
);

router.post(
  "/:slug/join",
  authMiddleware,
  validate(communitySlugSchema),
  joinCommunity
);

router.delete(
  "/:slug/leave",
  authMiddleware,
  validate(communitySlugSchema),
  leaveCommunity
);

router.get(
  "/:slug",
  optionalAuthMiddleware,
  validate(communitySlugSchema),
  getCommunityBySlug
);

export default router;