import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  createCommunityService,
  listCommunitiesService,
  getMyCommunitiesService,
  getTrendingCommunitiesService,
  getCommunityBySlugService,
  joinCommunityService,
  leaveCommunityService,
} from "./community.service";

interface SlugParams {
  slug: string;
}

export const createCommunity = asyncHandler(
  async (req: Request, res: Response) => {
    const community = await createCommunityService(
      req.user.id,
      req.body
    );

    res.status(201).json(
      apiResponse(
        community,
        "Community created successfully"
      )
    );
  }
);

export const listCommunities = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string;

    const result = await listCommunitiesService(
      page,
      limit,
      search
    );

    res.status(200).json(
      apiResponse(
        result,
        "Communities fetched successfully"
      )
    );
  }
);

export const getMyCommunities = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getMyCommunitiesService(
      req.user.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Your communities fetched successfully"
      )
    );
  }
);

export const getTrendingCommunities = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 5;

    const communities = await getTrendingCommunitiesService(
      limit
    );

    res.status(200).json(
      apiResponse(
        communities,
        "Trending communities fetched successfully"
      )
    );
  }
);

export const getCommunityBySlug = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    const community = await getCommunityBySlugService(
      req.params.slug,
      req.user?.id
    );

    res.status(200).json(
      apiResponse(
        community,
        "Community fetched successfully"
      )
    );
  }
);

export const joinCommunity = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    const membership = await joinCommunityService(
      req.params.slug,
      req.user.id
    );

    res.status(201).json(
      apiResponse(membership, "Joined community successfully")
    );
  }
);

export const leaveCommunity = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    await leaveCommunityService(req.params.slug, req.user.id);

    res.status(200).json(
      apiResponse(null, "Left community successfully")
    );
  }
);