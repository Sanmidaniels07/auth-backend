import { Request, Response } from "express";

import { apiResponse } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandlers";

import {
  createCommentService,
  deleteCommentService,
  getPostCommentsService,
  updateCommentService,
} from "./comment.service";
import { IdParams, PostParams } from "../../types/request.types";
;

export const createComment = asyncHandler(
  async (
    req: Request<PostParams>,
    res: Response
  ) => {
    const comment = await createCommentService(
      req.user.id,
      req.params.postId,
      req.body.content
    );

    res.status(201).json(
      apiResponse(comment, "Comment created")
    );
  }
);

export const getPostComments = asyncHandler(
  async (
    req: Request<PostParams>,
    res: Response
  ) => {
    const comments = await getPostCommentsService(
      req.params.postId
    );

    res.status(200).json(
      apiResponse(comments, "Comments fetched")
    );
  }
);

export const updateComment = asyncHandler(
  async (
    req: Request<IdParams>,
    res: Response
  ) => {
    const comment = await updateCommentService(
      req.params.id,
      req.user.id,
      req.body.content
    );

    res.status(200).json(
      apiResponse(comment, "Comment updated")
    );
  }
);

export const deleteComment = asyncHandler(
  async (
    req: Request<IdParams>,
    res: Response
  ) => {
    await deleteCommentService(
      req.params.id,
      req.user.id
    );

    res.status(200).json(
      apiResponse(null, "Comment deleted")
    );
  }
);