import prisma from "../prisma/prisma";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt";
import { AppError } from "../utils/appError";

export const refreshSessionService =
  async (refreshToken: string) => {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as {
      id: string;
    };

    const session =
      await prisma.session.findUnique({
        where: {
          refreshToken,
        },
        include: {
          user: true,
        },
      });

    if (!session) {
      throw new AppError(
        "Session not found",
        401
      );
    }

    if (
      session.expiresAt <
      new Date()
    ) {
      throw new AppError(
        "Session expired",
        401
      );
    }

    const newAccessToken =
      generateAccessToken(
        session.user.id,
        session.user.email,
        session.user.role
      );

    const newRefreshToken =
      generateRefreshToken(
        session.user.id
      );

    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    await prisma.session.create({
      data: {
        userId: session.user.id,
        refreshToken:
          newRefreshToken,
        expiresAt: new Date(
          Date.now() +
            7 *
              24 *
              60 *
              60 *
              1000
        ),
      },
    });

    return {
      accessToken:
        newAccessToken,
      refreshToken:
        newRefreshToken,
    };
  };

export const logoutService =
  async (
    refreshToken: string
  ) => {
    await prisma.session.deleteMany({
      where: {
        refreshToken,
      },
    });

    return {
      message:
        "Logged out successfully",
    };
  };