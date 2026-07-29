import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createCommunitySchema,
  listCommunitiesSchema,
  trendingCommunitiesSchema,
  communitySlugSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
} from "./community.validation";
import {
  createCommunity,
  listCommunities,
  getMyCommunities,
  getTrendingCommunities,
  getCommunityBySlug,
  joinCommunity,
  leaveCommunity,
  updateMemberRole,
  removeMember,
  deleteCommunity,
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

router.get(
  "/me",
  authMiddleware,
  validate(listCommunitiesSchema),
  getMyCommunities
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

router.patch(
  "/:slug/members/:userId/role",
  authMiddleware,
  validate(updateMemberRoleSchema),
  updateMemberRole
);

router.delete(
  "/:slug/members/:userId",
  authMiddleware,
  validate(removeMemberSchema),
  removeMember
);

router.delete(
  "/:slug",
  authMiddleware,
  validate(communitySlugSchema),
  deleteCommunity
);

router.get(
  "/:slug",
  optionalAuthMiddleware,
  validate(communitySlugSchema),
  getCommunityBySlug
);

export default router;