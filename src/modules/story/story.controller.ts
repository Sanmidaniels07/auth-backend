import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import {
  createStoryService,
  getActiveStoriesFeedService,
  getStoryByIdService,
  deleteStoryService,
  getStoryViewersService,
  reactToStoryService,
  removeStoryReactionService,
} from "./story.service";

export const createStory = asyncHandler(
  async (req: Request, res: Response) => {
    const story = await createStoryService(
      req.user.id,
      req.body.mediaUrl,
      req.body.mediaType,
      req.body.caption
    );

    res.status(201).json(
      apiResponse(story, "Story created successfully")
    );
  }
);

export const getStoriesFeed = asyncHandler(
  async (req: Request, res: Response) => {
    const feed = await getActiveStoriesFeedService(
      req.user.id
    );

    res.status(200).json(
      apiResponse(feed, "Stories fetched successfully")
    );
  }
);

export const getStoryById = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const story = await getStoryByIdService(
      req.params.id,
      req.user.id
    );

    res.status(200).json(
      apiResponse(story, "Story fetched successfully")
    );
  }
);

export const deleteStory = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await deleteStoryService(req.user.id, req.params.id);

    res.status(200).json(
      apiResponse(null, "Story deleted successfully")
    );
  }
);

export const getStoryViewers = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;

    const result = await getStoryViewersService(
      req.user.id,
      req.params.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(result, "Viewers fetched successfully")
    );
  }
);

export const reactToStory = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const reaction = await reactToStoryService(
      req.user.id,
      req.params.id,
      req.body.emoji
    );

    res.status(200).json(
      apiResponse(reaction, "Reaction added successfully")
    );
  }
);

export const removeStoryReaction = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await removeStoryReactionService(
      req.user.id,
      req.params.id
    );

    res.status(200).json(
      apiResponse(null, "Reaction removed successfully")
    );
  }
);
