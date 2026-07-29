import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  quickSearchService,
  searchByTypeService,
} from "./search.service";

interface TypeParams {
  type: "users" | "posts" | "communities" | "hashtags";
}

export const quickSearch = asyncHandler(
  async (req: Request, res: Response) => {
    const q = req.query.q as string;

    const result = await quickSearchService(
      q,
      req.user?.id
    );

    res.status(200).json(
      apiResponse(result, "Search results fetched successfully")
    );
  }
);

export const searchByType = asyncHandler(
  async (req: Request<TypeParams>, res: Response) => {
    const q = req.query.q as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await searchByTypeService(
      req.params.type,
      q,
      page,
      limit,
      req.user?.id
    );

    res.status(200).json(
      apiResponse(result, "Search results fetched successfully")
    );
  }
);
