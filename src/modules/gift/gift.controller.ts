import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  cancelGiftService,
  claimGiftService,
  declineGiftService,
  getGiftService,
  listGiftsService,
  sendGiftService,
} from "./gift.service";

interface CodeParams {
  code: string;
}

export const sendGift = asyncHandler(async (req: Request, res: Response) => {
  const result = await sendGiftService(req.user.id, req.body);
  res.status(201).json(apiResponse(result, "Gift created - complete the payment to send it"));
});

export const listGifts = asyncHandler(async (req: Request, res: Response) => {
  const box = req.query.box === "received" ? "received" : "sent";
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const result = await listGiftsService(req.user.id, box, page, limit);
  res.status(200).json(apiResponse(result, "Gifts fetched successfully"));
});

export const getGift = asyncHandler(async (req: Request<CodeParams>, res: Response) => {
  const gift = await getGiftService(req.params.code, req.user?.id);
  res.status(200).json(apiResponse(gift, "Gift fetched successfully"));
});

export const claimGift = asyncHandler(async (req: Request<CodeParams>, res: Response) => {
  const gift = await claimGiftService(req.user.id, req.params.code, req.body);
  res.status(200).json(apiResponse(gift, "Gift accepted - the seller is preparing it"));
});

export const declineGift = asyncHandler(async (req: Request<CodeParams>, res: Response) => {
  const gift = await declineGiftService(req.user.id, req.params.code);
  res.status(200).json(apiResponse(gift, "Gift declined - the sender is being refunded"));
});

export const cancelGift = asyncHandler(async (req: Request<CodeParams>, res: Response) => {
  const gift = await cancelGiftService(req.user.id, req.params.code);
  res.status(200).json(apiResponse(gift, "Gift cancelled - you're being refunded"));
});
