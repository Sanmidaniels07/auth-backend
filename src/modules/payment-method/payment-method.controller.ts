import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import { listPaystackBanks } from "../../utils/paystack";
import {
  listSavedCardsService,
  deleteSavedCardService,
  setDefaultSavedCardService,
} from "./payment-method.service";

export const listSavedCards = asyncHandler(
  async (req: Request, res: Response) => {
    const cards = await listSavedCardsService(req.user.id);

    res.status(200).json(
      apiResponse(cards, "Saved cards fetched successfully")
    );
  }
);

export const deleteSavedCard = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await deleteSavedCardService(
      req.user.id,
      req.params.id
    );

    res.status(200).json(
      apiResponse(null, "Saved card removed successfully")
    );
  }
);

export const setDefaultSavedCard = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await setDefaultSavedCardService(
      req.user.id,
      req.params.id
    );

    res.status(200).json(
      apiResponse(
        null,
        "Default saved card updated successfully"
      )
    );
  }
);

export const listBanks = asyncHandler(
  async (_req: Request, res: Response) => {
    const banks = await listPaystackBanks();

    res.status(200).json(
      apiResponse(banks, "Banks fetched successfully")
    );
  }
);
