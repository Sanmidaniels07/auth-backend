import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import { REFRESH_COOKIE_NAME, clearRefreshCookieOptions } from "../../utils/cookies";
import {
  changePasswordService,
  deleteAccountService,
  listSessionsService,
  revokeSessionService,
  revokeOtherSessionsService,
} from "./account.service";

export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await changePasswordService(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );

    res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions);

    res.status(200).json(
      apiResponse(result, "Password changed successfully")
    );
  }
);

export const deleteAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await deleteAccountService(
      req.user.id,
      req.body.password
    );

    res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions);

    res.status(200).json(
      apiResponse(result, "Account deleted successfully")
    );
  }
);

export const listSessions = asyncHandler(
  async (req: Request, res: Response) => {
    const currentToken = req.cookies?.[REFRESH_COOKIE_NAME];

    const sessions = await listSessionsService(
      req.user.id,
      currentToken
    );

    res.status(200).json(
      apiResponse(sessions, "Sessions fetched successfully")
    );
  }
);

export const revokeSession = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await revokeSessionService(req.user.id, req.params.id);

    res.status(200).json(
      apiResponse(null, "Session revoked successfully")
    );
  }
);

export const revokeOtherSessions = asyncHandler(
  async (req: Request, res: Response) => {
    const currentToken = req.cookies?.[REFRESH_COOKIE_NAME];

    await revokeOtherSessionsService(
      req.user.id,
      currentToken
    );

    res.status(200).json(
      apiResponse(
        null,
        "Other sessions revoked successfully"
      )
    );
  }
);