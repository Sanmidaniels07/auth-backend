import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  createPaymentLinkService,
  deletePaymentLinkService,
  getMyPaymentLinksService,
  getPublicPaymentLinkService,
  payPaymentLinkService,
  updatePaymentLinkService,
} from "./payment-link.service";

export const createPaymentLink = asyncHandler(
  async (req: Request, res: Response) => {
    const link = await createPaymentLinkService(req.user.id, req.body);

    res.status(201).json(
      apiResponse(link, "Payment link created")
    );
  }
);

export const getMyPaymentLinks = asyncHandler(
  async (req: Request, res: Response) => {
    const links = await getMyPaymentLinksService(req.user.id);

    res.status(200).json(
      apiResponse(links, "Payment links fetched successfully")
    );
  }
);

export const updatePaymentLink = asyncHandler(
  async (req: Request, res: Response) => {
    const link = await updatePaymentLinkService(req.user.id, req.params.id as string, req.body);

    res.status(200).json(
      apiResponse(link, "Payment link updated")
    );
  }
);

export const deletePaymentLink = asyncHandler(
  async (req: Request, res: Response) => {
    await deletePaymentLinkService(req.user.id, req.params.id as string);

    res.status(200).json(
      apiResponse(null, "Payment link deleted")
    );
  }
);

export const getPublicPaymentLink = asyncHandler(
  async (req: Request, res: Response) => {
    const link = await getPublicPaymentLinkService(req.params.code as string, req.user?.id);

    res.status(200).json(
      apiResponse(link, "Payment link fetched successfully")
    );
  }
);

export const payPaymentLink = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await payPaymentLinkService(req.user.id, req.params.code as string, req.body);

    res.status(201).json(
      apiResponse(result, "Payment started")
    );
  }
);
