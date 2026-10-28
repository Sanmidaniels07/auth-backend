import prisma from "../../prisma/prisma";
import { TrafficSource, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { AppError } from "../../utils/appError";
import { generateResetToken, generateVerificationToken } from "../../utils/token";
import { generateAccessToken, generateRefreshToken, generateTwoFactorToken } from "../../utils/jwt";
import { sendEmail } from "./email.services";
import { verificationTemplate } from "../../templates/verification.template";
import { resetTemplate } from "../../templates/reset.template";
import { verifyGoogleCredential } from "../../utils/googleAuth";

interface SignupData {
  name: string;
  email: string;
  password: string;
  /** Already validated and normalised to UTC midnight by signupSchema. */
  dateOfBirth?: Date;
  /** Seller share link they arrived through (?ref=CODE), if any. */
  referralCode?: string;
  /** Where they came from (admin overview). */
  source?: TrafficSource;
}

interface LoginData {
  email: string;
  password: string;
}

interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
}

export const issueUserSession = async (
  user: {
    id: string;
    name: string;
    email: string;
    role: import("@prisma/client").Role;
    isVerified: boolean;
  },
  device: DeviceInfo = {}
) => {
  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: device.userAgent,
      ipAddress: device.ipAddress,
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
export const signupService = async (data: SignupData) => {
  const { name, email, password, dateOfBirth, referralCode, source } = data;

  if (!name || !email || !password) {
    throw new Error("All fields are required");
  }

  // Case-insensitive: Google sign-ups are stored lower-case.
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const referredBy = await activeReferrer(referralCode);

  const verificationToken = generateVerificationToken();

  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      dateOfBirth,
      signupSource: source,
      ...(referredBy ? { referredByStoreId: referredBy.id, referredAt: new Date() } : {}),

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

export const loginService = async (
  data: LoginData,
  device: DeviceInfo = {}
) => {
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

  assertCanSignIn(user);

  if (!user.password) {
    throw new AppError(
      "This account signs in with Google. Tap Continue with Google, or use Forgot password to add a password.",
      400
    );
  }

  // Compare password
  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    throw new AppError("Invalid credentials", 401);
  }

  return finishSignIn(user, device);
};

const assertCanSignIn = (user: {
  deletedAt: Date | null;
  status: UserStatus;
  statusReason: string | null;
}) => {
  if (user.deletedAt) {
    throw new AppError("This account has been deleted", 401);
  }

  if (user.status === UserStatus.BANNED) {
    throw new AppError(
      user.statusReason
        ? `Your account has been banned: ${user.statusReason}`
        : "Your account has been banned.",
      403
    );
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError(
      user.statusReason
        ? `Your account has been suspended: ${user.statusReason}`
        : "Your account has been suspended.",
      403
    );
  }
};

// Password and Google sign-ins both still ask for the authenticator code
// when 2FA is on.
const finishSignIn = (
  user: Parameters<typeof issueUserSession>[0] & { twoFactorEnabled: boolean },
  device: DeviceInfo
) => {
  if (user.twoFactorEnabled) {
    return {
      requires2FA: true as const,
      twoFactorToken: generateTwoFactorToken(user.id),
    };
  }

  return issueUserSession(user, device);
};

/**
 * Continue with Google: signs in the account linked to that Google account,
 * otherwise links it to the account with the same (Google-verified) email,
 * otherwise creates a new account. New accounts come back with
 * isNewUser so the website can show the welcome step.
 */
export const googleAuthService = async (
  data: { credential: string; referralCode?: string; source?: TrafficSource },
  device: DeviceInfo = {}
) => {
  const google = await verifyGoogleCredential(data.credential);

  const existing =
    (await prisma.user.findUnique({ where: { googleId: google.googleId } })) ??
    (await prisma.user.findFirst({
      where: { email: { equals: google.email, mode: "insensitive" }, deletedAt: null },
    }));

  if (existing) {
    assertCanSignIn(existing);

    // Google has confirmed they own this email, so it also counts as
    // verifying it. If the email was never verified, whoever set the
    // password may not be its owner (someone can sign up with another
    // person's address first) - so that password and its sessions go, and
    // the owner can add their own password later.
    let user = existing;
    if (existing.googleId !== google.googleId || !existing.isVerified || (!existing.avatar && google.picture)) {
      const link = prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId: google.googleId,
          ...(existing.isVerified
            ? {}
            : { isVerified: true, password: null, verificationToken: null, verificationTokenExpiry: null }),
          ...(existing.avatar || !google.picture ? {} : { avatar: google.picture }),
        },
      });
      user = existing.isVerified
        ? await link
        : (await prisma.$transaction([prisma.session.deleteMany({ where: { userId: existing.id } }), link]))[1];
    }

    return { ...(await finishSignIn(user, device)), isNewUser: false };
  }

  const referredBy = await activeReferrer(data.referralCode);

  const user = await prisma.user.create({
    data: {
      name: google.name,
      email: google.email,
      googleId: google.googleId,
      avatar: google.picture,
      isVerified: true,
      signupSource: data.source,
      ...(referredBy ? { referredByStoreId: referredBy.id, referredAt: new Date() } : {}),
    },
  });

  return { ...(await issueUserSession(user, device)), isNewUser: true };
};

// Joined through a seller's share link - that store earns a referral
// reward on this buyer's orders for a while (utils/referral).
const activeReferrer = async (referralCode?: string) => {
  const referrer = referralCode
    ? await prisma.store.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
        select: { id: true, isSuspended: true },
      })
    : null;
  return referrer && !referrer.isSuspended ? referrer : null;
};

export const forgotPasswordService = async (email: string) => {
  // Also how Google sign-ups add a password. Case-insensitive because
  // those emails are stored lower-case.
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
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

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  sendEmail(
    user.email,
    "Reset your password",
    resetTemplate(user.name, resetUrl)
  ).catch(console.error);

  // The token used to be handed back in the response for convenience, but
  // now that it's actually emailed, returning it here too would defeat the
  // point of sending it somewhere only the account owner can read.
  return {
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
