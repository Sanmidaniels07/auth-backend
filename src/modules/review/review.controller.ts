import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import {
  createReviewService,
  updateReviewService,
  deleteReviewService,
  replyToReviewService,
} from "./review.service";

export const createReview = asyncHandler(
  async (req: Request, res: Response) => {
    const review = await createReviewService(
      req.user.id,
      req.body.productId,
      req.body.rating,
      req.body.comment
    );

    res.status(201).json(
      apiResponse(review, "Review created successfully")
    );
  }
);

export const updateReview = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const review = await updateReviewService(
      req.user.id,
      req.params.id,
      req.body
    );

    res.status(200).json(
      apiResponse(review, "Review updated successfully")
    );
  }
);

export const deleteReview = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await deleteReviewService(req.user.id, req.params.id);

    res.status(200).json(
      apiResponse(null, "Review deleted successfully")
    );
  }
);

export const replyToReview = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const review = await replyToReviewService(
      req.user.id,
      req.params.id,
      req.body.reply
    );

    res.status(200).json(
      apiResponse(review, "Reply added successfully")
    );
  }
);
