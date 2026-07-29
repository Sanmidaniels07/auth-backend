import { Request, Response } from "express";
import { forgotPasswordService, loginService, resetPasswordService, signupService } from "./auth.service";
import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "../../utils/cookies";


export const signup = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await signupService(req.body);

    res.status(201).json(
      apiResponse(
        result,
        "User created successfully"
      )
    );
  }
);

export const login = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await loginService(req.body, {
      userAgent: req.headers["user-agent"] as
        | string
        | undefined,
      ipAddress: req.ip,
    });

    if ("requires2FA" in result) {
      res.status(200).json(
        apiResponse(
          result,
          "Two-factor authentication required"
        )
      );
      return;
    }

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      refreshCookieOptions
    );

    res.status(200).json(
      apiResponse(
        result,
        "Login successful"
      )
    );
  }
);

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const result =
      await forgotPasswordService(
        req.body.email
      );

    res.status(200).json(
      apiResponse(
        result,
        "Reset token generated"
      )
    );
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await resetPasswordService(
      req.body.token,
      req.body.password
    );

    res.status(200).json(
      apiResponse(
        result,
        "Password reset successful"
      )
    );
  }
);


