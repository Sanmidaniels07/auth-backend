import { SellerStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

export const getApprovedSellerProfile = async (
  userId: string
) => {
  const seller = await prisma.sellerProfile.findUnique({
    where: { userId },
  });

  if (!seller) {
    throw new AppError("Seller profile not found.", 404);
  }

  if (seller.status === SellerStatus.PENDING) {
    throw new AppError(
      "Your seller application is still pending admin approval.",
      403
    );
  }

  if (seller.status === SellerStatus.REJECTED) {
    throw new AppError(
      seller.statusReason
        ? `Your seller application was rejected: ${seller.statusReason}`
        : "Your seller application was rejected.",
      403
    );
  }

  return seller;
};

export const getSellerStore = async (userId: string) => {
  const seller = await getApprovedSellerProfile(userId);

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

/**
 * The seller's store for working on orders already placed (orders, returns,
 * earnings). Like getSellerStore, but a seller rejected with "stop new
 * sales" (Store.salesStoppedAt) still gets in, so they can finish the
 * orders buyers have already paid for.
 */
export const getSellerStoreForOrders = async (userId: string) => {
  const seller = await prisma.sellerProfile.findUnique({
    where: { userId },
    include: { store: true },
  });

  // (Also while a reapplication is pending.)
  if (seller && seller.status !== SellerStatus.APPROVED && seller.store?.salesStoppedAt) {
    return seller.store;
  }

  return getSellerStore(userId);
};
