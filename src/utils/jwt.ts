import { Role } from "@prisma/client";
import jwt from "jsonwebtoken";

export const generateAccessToken = (
  userId: string,
  email: string,
  role: Role
) => {
  return jwt.sign(
    {
      id: userId,
      email,
      role,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "15m",
    }
  );
};

export const generateRefreshToken = (
  userId: string
) => {
  return jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_REFRESH_SECRET as string,
    {
      expiresIn: "7d",
    }
  );
};

export const generateTwoFactorToken = (
  userId: string
) => {
  return jwt.sign(
    { id: userId, purpose: "2fa" },
    process.env.JWT_SECRET as string,
    { expiresIn: "5m" }
  );
};

export const verifyTwoFactorToken = (
  token: string
): { id: string } => {
  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET as string
  ) as { id: string; purpose?: string };

  if (decoded.purpose !== "2fa") {
    throw new Error("Invalid token purpose");
  }

  return { id: decoded.id };
};