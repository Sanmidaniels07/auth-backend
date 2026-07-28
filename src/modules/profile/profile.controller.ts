import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  getProfileService,
  updateProfileService,
} from "./profile.service";

export const getProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const profile = await getProfileService(req.user.id);

    res.status(200).json(
      apiResponse(profile, "Profile fetched successfully")
    );
  }
);

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const profile = await updateProfileService(
      req.user.id,
      req.body
    );

    res.status(200).json(
      apiResponse(profile, "Profile updated successfully")
    );
  }
);