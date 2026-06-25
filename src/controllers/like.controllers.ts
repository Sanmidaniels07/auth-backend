import { Response, Request } from "express";
import { AuthRequest } from "../middleware/auth-middleware";
import { asyncHandler } from "../utils/asyncHandlers";
import { apiResponse } from "../utils/apiResponse";

import {
  likePostService,
  unlikePostService,
  getPostLikesService,
} from "../services/like.services";

export const likePost = asyncHandler(
  async (
    req: AuthRequest,
    res: Response
  ) => {
    const postId =
      req.params.postId as string;

    const like =
      await likePostService(
        req.user!.id,
        postId
      );

    res.status(201).json(
      apiResponse(
        like,
        "Post liked"
      )
    );
  }
);

export const unlikePost =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response
    ) => {
      const postId =
        req.params.postId as string;

      await unlikePostService(
        req.user!.id,
        postId
      );

      res.status(200).json(
        apiResponse(
          null,
          "Post unliked"
        )
      );
    }
  );

  export const getPostLikes =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      const postId =
        req.params.postId as string;

      const likes =
        await getPostLikesService(
          postId
        );

      res.status(200).json(
        apiResponse(
          likes,
          "Likes fetched"
        )
      );
    }
  );