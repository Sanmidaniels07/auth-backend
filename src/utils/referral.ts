import crypto from "crypto";

import prisma from "../prisma/prisma";

// Seller referrals: each store's share links carry ?ref=<code>. Someone who
// signs up after arriving through one is linked to that store, and for the
// first 90 days the seller pays 2 percentage points less commission on
// that buyer's orders from their store (e.g. 10% -> 8%).

export const REFERRAL_COMMISSION_OFF = 2;
export const REFERRAL_REWARD_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

// No 0/O or 1/I so codes read cleanly off a flyer.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomCode = () =>
  Array.from(crypto.randomBytes(8), (byte) => ALPHABET[byte % ALPHABET.length]).join("");

export const generateReferralCode = async () => {
  for (;;) {
    const code = randomCode();
    const taken = await prisma.store.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!taken) return code;
  }
};

interface Buyer {
  id: string;
  referredByStoreId: string | null;
  referredAt: Date | null;
}

// Does this buyer's order from this store earn the referral reward?
export const referralRewardApplies = (
  buyer: Buyer,
  store: { id: string; sellerUserId: string },
  now: Date = new Date()
) =>
  buyer.referredByStoreId === store.id &&
  !!buyer.referredAt &&
  now.getTime() - buyer.referredAt.getTime() < REFERRAL_REWARD_DAYS * DAY_MS &&
  // A seller can't earn it on their own purchases.
  buyer.id !== store.sellerUserId;

export const referralCommission = (rate: number) => Math.max(0, rate - REFERRAL_COMMISSION_OFF);
