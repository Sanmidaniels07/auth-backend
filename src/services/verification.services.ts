import prisma from "../prisma/prisma";
import { verificationTemplate } from "../templates/verification.template";
import { AppError }
from "../utils/appError";
import { sendEmail } from "./email.services";
import crypto from "crypto";

export const
verifyEmailService =
async (
  token: string
) => {

  const user =
    await prisma.user.findFirst({
      where: {
        verificationToken:
          token,
      },
    });

  if (!user) {
    throw new AppError(
      "Invalid token",
      400
    );
  }

  if (
    !user.verificationTokenExpiry ||
    user
      .verificationTokenExpiry <
      new Date()
  ) {
    throw new AppError(
      "Token expired",
      400
    );
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },

    data: {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiry:
        null,
    },
  });

  return {
    message:
      "Email verified successfully",
  };
};

export const resendVerificationService =
  async (email: string) => {
    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (!user) {
      throw new AppError(
        "User not found",
        404
      );
    }

    if (user.isVerified) {
      throw new AppError(
        "Email already verified",
        400
      );
    }

    const verificationToken =
      crypto.randomBytes(32)
        .toString("hex");

    const expiry =
      new Date(
        Date.now() +
          24 *
            60 *
            60 *
            1000
      );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        verificationToken,
        verificationTokenExpiry:
          expiry,
      },
    });

    const verificationUrl =
      `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    await sendEmail(
      user.email,
      "Verify your account",
      verificationTemplate(
        user.name,
        verificationUrl
      )
    );

    return {
      message:
        "Verification email sent",
    };
  };