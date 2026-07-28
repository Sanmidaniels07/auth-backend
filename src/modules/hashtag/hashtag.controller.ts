import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  getTrendingHashtagsService,
  getPostsByHashtagService,
} from "./hashtag.service";

interface TagParams {
  tag: string;
}

export const getTrendingHashtags = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 10;
    const days = Number(req.query.days) || 7;

    const hashtags = await getTrendingHashtagsService(
      limit,
      days
    );

    res.status(200).json(
      apiResponse(
        hashtags,
        "Trending hashtags fetched successfully"
      )
    );
  }
);

export const getPostsByHashtag = asyncHandler(
  async (req: Request<TagParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await getPostsByHashtagService(
      req.params.tag,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(result, "Posts fetched successfully")
    );
  }
);