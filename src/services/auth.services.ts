import prisma from "../prisma/prisma";
import bcrypt from "bcrypt";
import { AppError } from "../utils/appError";
import { generateResetToken, generateVerificationToken } from "../utils/token";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { sendEmail } from "./email.services";
import { verificationTemplate } from "../templates/verification.template";

interface SignupData {
  name: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}
export const signupService = async (data: SignupData) => {
  const { name, email, password } = data;

  if (!name || !email || !password) {
    throw new Error("All fields are required");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const verificationToken = generateVerificationToken();

  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,

      verificationToken,
      verificationTokenExpiry: expiry,
    },
  });

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

  sendEmail(
    user.email,
    "Verify your account",
    verificationTemplate(user.name, verificationUrl),
  ).catch(console.error);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isVerified: user.isVerified,
  };
};

export const loginService = async (data: LoginData) => {
  const { email, password } = data;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  // Compare password
  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    throw new AppError("Invalid credentials", 401);
  }

  // Generate access token
  const accessToken = generateAccessToken(user.id, user.email, user.role);

  // Generate refresh token
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token in DB
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  };
};

export const forgotPasswordService = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const token = generateResetToken();

  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetTokenExpiry: expiry,
    },
  });

  return {
    resetToken: token,
    expiresAt: expiry,
  };
};

export const resetPasswordService = async (token: string, password: string) => {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
    },
  });

  if (!user) {
    throw new AppError("Invalid token", 400);
  }

  if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new AppError("Token expired", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return {
    message: "Password reset successful",
  };
};
