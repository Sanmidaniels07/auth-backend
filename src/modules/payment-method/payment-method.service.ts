import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

interface PaystackAuthorization {
  authorization_code: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  bank: string | null;
  card_type: string | null;
  reusable: boolean;
}

// The same physical card: Paystack gives a new authorization code on every
// payment with a new-card form, so the code alone made one card show up many
// times. Last 4 digits + expiry + bank + type identify it well enough.
const sameCard = (card: { last4: string | null; expMonth: string | null; expYear: string | null; bank: string | null; cardType: string | null }) =>
  [card.last4, card.expMonth, card.expYear, card.bank, card.cardType].map((v) => (v ?? "").trim().toLowerCase()).join("|");

export const saveCardFromAuthorization = async (
  userId: string,
  authorization: PaystackAuthorization
) => {
  if (!authorization.reusable) {
    return null;
  }

  // Already saved (a new code for the same card): keep one entry, with the
  // newest code.
  const fingerprint = sameCard({
    last4: authorization.last4,
    expMonth: authorization.exp_month,
    expYear: authorization.exp_year,
    bank: authorization.bank,
    cardType: authorization.card_type,
  });
  const mine = await prisma.savedCard.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  const existing = mine.find((card) => sameCard(card) === fingerprint);
  if (existing) {
    if (existing.authorizationCode === authorization.authorization_code) return existing;
    const taken = await prisma.savedCard.findUnique({ where: { authorizationCode: authorization.authorization_code } });
    if (taken) return taken;
    return prisma.savedCard.update({ where: { id: existing.id }, data: { authorizationCode: authorization.authorization_code } });
  }
  const existingCount = mine.length;

  return prisma.savedCard.upsert({
    where: {
      authorizationCode: authorization.authorization_code,
    },
    create: {
      userId,
      authorizationCode: authorization.authorization_code,
      last4: authorization.last4,
      expMonth: authorization.exp_month,
      expYear: authorization.exp_year,
      bank: authorization.bank,
      cardType: authorization.card_type,
      isDefault: existingCount === 0,
    },
    update: {},
  });
};

export const listSavedCardsService = async (
  userId: string
) => {
  const cards = await prisma.savedCard.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  // Copies of one card saved before duplicates were merged: show it once
  // (the default, else the newest).
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = sameCard(card);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const deleteSavedCardService = async (
  userId: string,
  cardId: string
) => {
  const card = await prisma.savedCard.findUnique({
    where: { id: cardId },
  });

  if (!card || card.userId !== userId) {
    throw new AppError("Saved card not found.", 404);
  }

  // Removing a card removes every copy of it.
  const copies = (await prisma.savedCard.findMany({ where: { userId } })).filter((other) => sameCard(other) === sameCard(card));
  await prisma.savedCard.deleteMany({ where: { id: { in: copies.map((copy) => copy.id) } } });

  if (card.isDefault) {
    const remaining = await prisma.savedCard.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    if (remaining) {
      await prisma.savedCard.update({
        where: { id: remaining.id },
        data: { isDefault: true },
      });
    }
  }
};

export const setDefaultSavedCardService = async (
  userId: string,
  cardId: string
) => {
  const card = await prisma.savedCard.findUnique({
    where: { id: cardId },
  });

  if (!card || card.userId !== userId) {
    throw new AppError("Saved card not found.", 404);
  }

  await prisma.$transaction([
    prisma.savedCard.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.savedCard.update({
      where: { id: cardId },
      data: { isDefault: true },
    }),
  ]);
};
