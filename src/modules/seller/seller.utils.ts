import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

export const getSellerStore = async (userId: string) => {
  const seller = await prisma.sellerProfile.findUnique({
    where: { userId },
  });

  if (!seller) {
    throw new AppError("Seller profile not found.", 404);
  }

  const store = await prisma.store.findUnique({
    where: { sellerId: seller.id },
  });

  if (!store) {
    throw new AppError(
      "You must create a store first.",
      403
    );
  }

  return store;
};
