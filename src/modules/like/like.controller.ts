import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";

import {
  getPostLikesService,
  likePostService,
  unlikePostService,
} from "./like.services";

import { PostParams } from "../../types/request.types";

export const likePost = asyncHandler(
  async (
    req: Request<PostParams>,
    res: Response
  ) => {
    const like = await likePostService(
      req.user.id,
      req.params.postId
    );

    res.status(201).json(
      apiResponse(like, "Post liked")
    );
  }
);

export const unlikePost = asyncHandler(
  async (
    req: Request<PostParams>,
    res: Response
  ) => {
    await unlikePostService(
      req.user.id,
      req.params.postId
    );

    res.status(200).json(
      apiResponse(
        null,
        "Post unliked"
      )
    );
  }
);

export const getPostLikes = asyncHandler(
  async (
    req: Request<PostParams>,
    res: Response
  ) => {
    const likes = await getPostLikesService(
      req.params.postId
    );

    res.status(200).json(
      apiResponse(
        likes,
        "Likes fetched"
      )
    );
  }
);