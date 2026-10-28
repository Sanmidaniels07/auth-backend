import bcrypt from "bcrypt";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { verifyGoogleCredential } from "../../utils/googleAuth";

export const changePasswordService = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (!user.password) {
    throw new AppError(
      "You sign in with Google and don't have a password yet. Use Forgot password on the login page to add one.",
      400
    );
  }

  const isCorrect = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!isCorrect) {
    throw new AppError(
      "Current password is incorrect.",
      400
    );
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    10
  );

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    }),
    // Force re-login everywhere else once the password changes.
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  return { message: "Password changed successfully." };
};

export const deleteAccountService = async (
  userId: string,
  confirm: { password?: string; googleCredential?: string }
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (user.password) {
    const isCorrect = await bcrypt.compare(
      confirm.password ?? "",
      user.password
    );

    if (!isCorrect) {
      throw new AppError("Password is incorrect.", 400);
    }
  } else {
    // Google-only account: a fresh Google sign-in for this same account.
    const google = confirm.googleCredential
      ? await verifyGoogleCredential(confirm.googleCredential)
      : null;

    if (!google || google.googleId !== user.googleId) {
      throw new AppError("Please confirm with the Google account you sign in with.", 400);
    }
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    // No more push notifications to their devices.
    prisma.webPushSubscription.deleteMany({ where: { userId } }),
    // Soft delete: keep the row (existing posts/orders/etc. reference it),
    // but free up the email/username/Google account for reuse and block
    // future logins.
    prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}_${user.email}`,
        username: null,
        googleId: null,
      },
    }),
  ]);

  return { message: "Account deleted successfully." };
};

export const listSessionsService = async (
  userId: string,
  currentRefreshToken?: string
) => {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
      refreshToken: true,
    },
  });

  return sessions.map(({ refreshToken, ...session }) => ({
    ...session,
    isCurrent: refreshToken === currentRefreshToken,
  }));
};

export const revokeSessionService = async (
  userId: string,
  sessionId: string
) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw new AppError("Session not found.", 404);
  }

  await prisma.session.delete({
    where: { id: sessionId },
  });
};

export const revokeOtherSessionsService = async (
  userId: string,
  currentRefreshToken?: string
) => {
  await prisma.session.deleteMany({
    where: {
      userId,
      ...(currentRefreshToken
        ? { NOT: { refreshToken: currentRefreshToken } }
        : {}),
    },
  });
};