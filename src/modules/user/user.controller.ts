import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdentifierParams } from "../../types/request.types";
import {
  listUsersService,
  getSuggestedUsersService,
  getUserProfileService,
} from "./user.service";

export const getUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string;

    const result = await listUsersService(
      page,
      limit,
      search,
      req.user?.id
    );

    res.status(200).json(
      apiResponse(result, "Users fetched successfully")
    );
  }
);

export const getSuggestedUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 5;

    const users = await getSuggestedUsersService(
      req.user.id,
      limit
    );

    res.status(200).json(
      apiResponse(
        users,
        "Suggested users fetched successfully"
      )
    );
  }
);

export const getUserProfile = asyncHandler(
  async (req: Request<IdentifierParams>, res: Response) => {
    const profile = await getUserProfileService(
      req.params.identifier,
      req.user?.id
    );

    res.status(200).json(
      apiResponse(
        profile,
        "User profile fetched successfully"
      )
    );
  }
);