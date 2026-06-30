import jwt from "jsonwebtoken";

export const generateAccessToken = (
  userId: string,
  email: string,
  role: string
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