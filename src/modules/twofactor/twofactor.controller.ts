import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../../utils/cookies";
import {
  setupTwoFactorService,
  verifyTwoFactorSetupService,
  disableTwoFactorService,
  loginWithTwoFactorService,
} from "./twofactor.service";

export const setupTwoFactor = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await setupTwoFactorService(
      req.user.id,
      req.user.email
    );

    res.status(200).json(
      apiResponse(
        result,
        "Scan the QR code with your authenticator app, then verify to enable"
      )
    );
  }
);

export const verifyTwoFactorSetup = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await verifyTwoFactorSetupService(
      req.user.id,
      req.body.token
    );

    res.status(200).json(
      apiResponse(
        result,
        "Two-factor authentication enabled successfully"
      )
    );
  }
);

export const disableTwoFactor = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await disableTwoFactorService(
      req.user.id,
      req.body.token
    );

    res.status(200).json(
      apiResponse(
        result,
        "Two-factor authentication disabled successfully"
      )
    );
  }
);

export const loginWithTwoFactor = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await loginWithTwoFactorService(
      req.body.twoFactorToken,
      req.body.token,
      {
        userAgent: req.headers["user-agent"] as
          | string
          | undefined,
        ipAddress: req.ip,
      }
    );

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      refreshCookieOptions
    );

    res.status(200).json(
      apiResponse(result, "Login successful")
    );
  }
);