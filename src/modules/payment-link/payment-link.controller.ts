import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "../../utils/cookies";
import { issueUserSession } from "../auth/auth.service";
import {
  claimGuestAccountService,
  confirmGuestDeliveryService,
  createPaymentLinkService,
  deletePaymentLinkService,
  getGuestOrderService,
  getMyPaymentLinksService,
  getPublicPaymentLinkService,
  guestPayPaymentLinkService,
  payPaymentLinkService,
  updatePaymentLinkService,
  verifyGuestOrderService,
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

export const guestPayPaymentLink = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await guestPayPaymentLinkService(req.params.code as string, req.body);

    res.status(201).json(
      apiResponse(result, "Payment started")
    );
  }
);

export const getGuestOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await getGuestOrderService(req.params.token as string);

    res.status(200).json(
      apiResponse(order, "Order fetched successfully")
    );
  }
);

export const verifyGuestOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await verifyGuestOrderService(req.params.token as string);

    res.status(200).json(
      apiResponse(order, "Payment confirmed")
    );
  }
);

export const confirmGuestDelivery = asyncHandler(
  async (req: Request, res: Response) => {
    const order = await confirmGuestDeliveryService(req.params.token as string, req.params.orderItemId as string);

    res.status(200).json(
      apiResponse(order, "Delivery confirmed")
    );
  }
);

// Sets a password on the guest account and signs them in (refresh cookie,
// as at login) - or emails a set-password link instead (see the service).
export const claimGuestAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await claimGuestAccountService(req.params.token as string, req.body.password);

    if (result.emailSent) {
      res.status(200).json(
        apiResponse({ emailSent: true, email: result.email }, "We've emailed you a link to set your password")
      );
      return;
    }

    const session = await issueUserSession(result.user, {
      userAgent: req.headers["user-agent"] as string | undefined,
      ipAddress: req.ip,
    });

    res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions);

    res.status(200).json(
      apiResponse({ emailSent: false, accessToken: session.accessToken, user: session.user }, "Your account is ready")
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
