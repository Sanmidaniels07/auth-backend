import {
  Request,
  Response,
} from "express";

import { logoutService, refreshSessionService } from "./session.service";
import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { AppError } from "../../utils/appError";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  clearRefreshCookieOptions,
} from "../../utils/cookies";


export const refreshToken =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      const token = req.cookies?.[REFRESH_COOKIE_NAME];

      if (!token) {
        throw new AppError(
          "Refresh token missing.",
          401
        );
      }

      const tokens =
        await refreshSessionService(
          token,
          {
            userAgent: req.headers["user-agent"] as
              | string
              | undefined,
            ipAddress: req.ip,
          }
        );

      res.cookie(
        REFRESH_COOKIE_NAME,
        tokens.refreshToken,
        refreshCookieOptions
      );

      res.json(
        apiResponse(
          tokens,
          "Token refreshed"
        )
      );
    }
  );

  export const logout =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      const token = req.cookies?.[REFRESH_COOKIE_NAME];

      if (token) {
        await logoutService(
          token
        );
      }

      res.clearCookie(
        REFRESH_COOKIE_NAME,
        clearRefreshCookieOptions
      );

      res.json(
        apiResponse(
          null,
          "Logged out successfully"
        )
      );
    }
  );
