import { Router } from "express";

import { validate } from "../../middleware/validate.middleware";
import {
  trendingHashtagsSchema,
  postsByHashtagSchema,
} from "./hashtag.validation";
import {
  getTrendingHashtags,
  getPostsByHashtag,
} from "./hashtag.controller";

const router = Router();

router.get(
  "/trending",
  validate(trendingHashtagsSchema),
  getTrendingHashtags
);

router.get(
  "/:tag/posts",
  validate(postsByHashtagSchema),
  getPostsByHashtag
);

export default router;