import { Request, Response } from "express";
import { forgotPasswordService, loginService, resetPasswordService, signupService } from "../services/auth.services";
import { apiResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandlers";

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
    const result = await loginService(req.body);

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