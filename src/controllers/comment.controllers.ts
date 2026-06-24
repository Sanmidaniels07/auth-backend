import { AuthRequest } from "../middleware/auth-middleware";
import { createCommentService, getPostCommentsService } from "../services/comment.services";
import { apiResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandlers";
import { Request, Response } from "express";

export const createComment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const postId = req.params.postId as string;

    const comment = await createCommentService(
      req.user!.id,
      postId,
      req.body.content
    );

    res.status(201).json(apiResponse(comment, "Comment created"));
  }
);

export const getPostComments = asyncHandler(
  async (req: Request, res: Response) => {
    const postId = req.params.postId as string;

    const comments = await getPostCommentsService(postId);

    res.status(200).json(apiResponse(comments, "Comments fetched"));
  }
);