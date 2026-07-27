import {
  Request,
  Response,
} from "express";

import { logoutService, refreshSessionService } from "./session.service";
import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";


export const refreshToken =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      const { refreshToken } =
        req.body;

      const tokens =
        await refreshSessionService(
          refreshToken
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
      const { refreshToken } =
        req.body;

      await logoutService(
        refreshToken
      );

      res.json(
        apiResponse(
          null,
          "Logged out successfully"
        )
      );
    }
  );