import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { UserIdParams } from "../../types/request.types";
import {
  followUserService,
  unfollowUserService,
  getFollowersService,
  getFollowingService,
  getFollowStatusService,
} from "./follow.service";

export const followUser = asyncHandler(
  async (req: Request<UserIdParams>, res: Response) => {
    const follow = await followUserService(
      req.user.id,
      req.params.userId
    );

    res.status(201).json(
      apiResponse(follow, "Followed successfully")
    );
  }
);

export const unfollowUser = asyncHandler(
  async (req: Request<UserIdParams>, res: Response) => {
    await unfollowUserService(
      req.user.id,
      req.params.userId
    );

    res.status(200).json(
      apiResponse(null, "Unfollowed successfully")
    );
  }
);

export const getFollowers = asyncHandler(
  async (req: Request<UserIdParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getFollowersService(
      req.params.userId,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Followers fetched successfully"
      )
    );
  }
);

export const getFollowing = asyncHandler(
  async (req: Request<UserIdParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getFollowingService(
      req.params.userId,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Following fetched successfully"
      )
    );
  }
);

export const getFollowStatus = asyncHandler(
  async (req: Request<UserIdParams>, res: Response) => {
    const result = await getFollowStatusService(
      req.user.id,
      req.params.userId
    );

    res.status(200).json(
      apiResponse(
        result,
        "Follow status fetched successfully"
      )
    );
  }
);