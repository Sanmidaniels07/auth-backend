import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { UserIdParams } from "../../types/request.types";
import {
  blockUserService,
  unblockUserService,
  getBlockedUsersService,
} from "./block.service";

export const blockUser = asyncHandler(
  async (req: Request<UserIdParams>, res: Response) => {
    const result = await blockUserService(
      req.user.id,
      req.params.userId
    );

    res.status(201).json(
      apiResponse(result, "User blocked successfully")
    );
  }
);

export const unblockUser = asyncHandler(
  async (req: Request<UserIdParams>, res: Response) => {
    await unblockUserService(req.user.id, req.params.userId);

    res.status(200).json(
      apiResponse(null, "User unblocked successfully")
    );
  }
);

export const getBlockedUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getBlockedUsersService(
      req.user.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Blocked users fetched successfully"
      )
    );
  }
);
