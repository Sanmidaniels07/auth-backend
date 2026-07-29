import bcrypt from "bcrypt";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

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
  password: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const isCorrect = await bcrypt.compare(
    password,
    user.password
  );

  if (!isCorrect) {
    throw new AppError("Password is incorrect.", 400);
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    // Soft delete: keep the row (existing posts/orders/etc. reference it),
    // but free up the email/username for reuse and block future logins.
    prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}_${user.email}`,
        username: null,
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