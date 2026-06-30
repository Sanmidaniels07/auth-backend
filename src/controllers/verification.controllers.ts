import {
  Request,
  Response,
} from "express";

import {
  resendVerificationService,
  verifyEmailService
} from "../services/verification.services";

import {
  asyncHandler
} from "../utils/asyncHandlers";

import {
  apiResponse
} from "../utils/apiResponse";

export const verifyEmail = asyncHandler(
  async (
    req: Request<{ token: string }>,
    res: Response
  ) => {
    const result =
      await verifyEmailService(
        req.params.token
      );

    res.status(200).json(
      apiResponse(
        result,
        "Email verified"
      )
    );
  }
);

export const resendVerification =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      const result =
        await resendVerificationService(
          req.body.email
        );

      res.status(200).json(
        apiResponse(
          result,
          "Verification email sent"
        )
      );
    }
  );