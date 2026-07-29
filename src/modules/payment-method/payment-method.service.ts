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

export const saveCardFromAuthorization = async (
  userId: string,
  authorization: PaystackAuthorization
) => {
  if (!authorization.reusable) {
    return null;
  }

  const existingCount = await prisma.savedCard.count({
    where: { userId },
  });

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
  return prisma.savedCard.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
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

  await prisma.savedCard.delete({
    where: { id: cardId },
  });

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
