import crypto from "crypto";
import { TrafficSource, UserStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

// Guest checkout (a payment link or the shop cart, without an account):
// behind the scenes the buyer gets a guest account with no password, so
// the order works like any other. They follow it through a private
// tracking link and can turn the account into a full one afterwards.

/** The secret in a guest's private tracking link (/orders/track/{token}). */
export const generateGuestToken = () => crypto.randomBytes(24).toString("base64url");

export interface GuestIdentity {
  name: string;
  email: string;
  source?: TrafficSource;
  // The seller's share code from ?ref= - same as at signup.
  referralCode?: string;
}

/**
 * The guest account for this email: an existing guest account is reused
 * (no session is given - each order has its own tracking link), a new one
 * is made otherwise. An email that belongs to a full account must log in.
 */
export const guestAccountFor = async (data: GuestIdentity) => {
  const existing = await prisma.user.findFirst({
    where: { email: { equals: data.email, mode: "insensitive" } },
  });

  if (existing) {
    if (existing.deletedAt || existing.status !== UserStatus.ACTIVE) {
      throw new AppError("This email can't be used for checkout. Use another email address.", 400);
    }
    if (!existing.isGuest) {
      throw new AppError("You already have a Nestly account with this email. Log in to pay.", 409);
    }
    return existing;
  }

  const referredBy = data.referralCode
    ? await prisma.store.findUnique({
        where: { referralCode: data.referralCode.toUpperCase() },
        select: { id: true, isSuspended: true },
      })
    : null;

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      isGuest: true,
      guestSince: new Date(),
      signupSource: data.source,
      ...(referredBy && !referredBy.isSuspended ? { referredByStoreId: referredBy.id, referredAt: new Date() } : {}),
    },
  });
};

/** "No thanks" to the account offer after checkout - kept for the admin's guest list. */
export const declineGuestAccountService = async (userId: string) => {
  await prisma.user.updateMany({
    where: { id: userId, isGuest: true, guestDeclinedAt: null },
    data: { guestDeclinedAt: new Date() },
  });
};
