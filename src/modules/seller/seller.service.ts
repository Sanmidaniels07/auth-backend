import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

export const becomeSellerService = async (
  userId: string,
  cacNumber?: string
) => {
  const existingSeller =
    await prisma.sellerProfile.findUnique({
      where: {
        userId,
      },
    });

  if (existingSeller) {
    throw new AppError(
      "Seller profile already exists.",
      400
    );
  }

  const seller =
    await prisma.sellerProfile.create({
      data: {
        userId,
        cacNumber,
      },
    });

  return seller;
};

export const getSellerProfileService = async (
  userId: string
) => {
  const seller =
    await prisma.sellerProfile.findUnique({
      where: {
        userId,
      },
      include: {
        store: true,
      },
    });

  if (!seller) {
    throw new AppError(
      "Seller profile not found.",
      404
    );
  }

  return seller;
};

export const updateSellerService = async (
  userId: string,
  data: { cacNumber?: string }
) => {
  const seller =
    await prisma.sellerProfile.findUnique({
      where: {
        userId,
      },
    });

  if (!seller) {
    throw new AppError(
      "Seller profile not found.",
      404
    );
  }

  return prisma.sellerProfile.update({
    where: {
      userId,
    },
    data,
  });
};