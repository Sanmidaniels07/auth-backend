import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { verifyTwoFactorToken } from "../../utils/jwt";
import { issueUserSession } from "../auth/auth.service";

const ISSUER = "Nestly";

interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
}

export const setupTwoFactorService = async (
  userId: string,
  email: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (user.twoFactorEnabled) {
    throw new AppError(
      "Two-factor authentication is already enabled.",
      400
    );
  }

  const secret = await generateSecret();
  const otpauthUrl = await generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  // Stored but not yet "enabled" until the user proves they can generate a
  // valid code from it via the verify step.
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });

  return { qrCodeDataUrl, secret };
};

export const verifyTwoFactorSetupService = async (
  userId: string,
  token: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.twoFactorSecret) {
    throw new AppError(
      "No pending two-factor setup found.",
      400
    );
  }

  const result = await verify({
    secret: user.twoFactorSecret,
    token,
  });

  if (!result.valid) {
    throw new AppError(
      "Invalid authentication code.",
      400
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  return {
    message:
      "Two-factor authentication enabled successfully.",
  };
};

export const disableTwoFactorService = async (
  userId: string,
  token: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (
    !user ||
    !user.twoFactorEnabled ||
    !user.twoFactorSecret
  ) {
    throw new AppError(
      "Two-factor authentication is not enabled.",
      400
    );
  }

  const result = await verify({
    secret: user.twoFactorSecret,
    token,
  });

  if (!result.valid) {
    throw new AppError(
      "Invalid authentication code.",
      400
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });

  return {
    message:
      "Two-factor authentication disabled successfully.",
  };
};

export const loginWithTwoFactorService = async (
  twoFactorToken: string,
  token: string,
  device: DeviceInfo = {}
) => {
  let payload: { id: string };

  try {
    payload = verifyTwoFactorToken(twoFactorToken);
  } catch {
    throw new AppError(
      "Two-factor challenge expired or invalid. Please log in again.",
      401
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
  });

  if (
    !user ||
    !user.twoFactorEnabled ||
    !user.twoFactorSecret
  ) {
    throw new AppError(
      "Two-factor authentication is not enabled for this account.",
      400
    );
  }

  if (user.deletedAt) {
    throw new AppError(
      "This account has been deleted",
      401
    );
  }

  const result = await verify({
    secret: user.twoFactorSecret,
    token,
  });

  if (!result.valid) {
    throw new AppError(
      "Invalid authentication code.",
      400
    );
  }

  return issueUserSession(user, device);
};