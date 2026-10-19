import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  getStateLocationsService,
  listStatesService,
  reverseGeocodeService,
} from "./location.service";

export const listStates = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(apiResponse(listStatesService(), "States fetched successfully"));
});

export const getStateLocations = asyncHandler(
  async (req: Request<{ state: string }>, res: Response) => {
    res
      .status(200)
      .json(apiResponse(getStateLocationsService(req.params.state), "Locations fetched successfully"));
  }
);

export const reverseGeocode = asyncHandler(async (req: Request, res: Response) => {
  const result = await reverseGeocodeService(Number(req.query.lat), Number(req.query.lng));

  res.status(200).json(apiResponse(result, "Location detected successfully"));
});
