import { Role } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { createNotificationService } from "../notification/notification.service";

const notifyAdminsOfNewSellerApplication = async (
  applicantId: string,
  sellerProfileId: string
) => {
  const [applicant, admins] = await Promise.all([
    prisma.user.findUnique({ where: { id: applicantId } }),
    prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    }),
  ]);

  if (!applicant) return;

  for (const admin of admins) {
    createNotificationService(
      admin.id,
      "New seller application",
      `${applicant.name} applied to become a seller.`,
      undefined,
      { type: "ADMIN_SELLER_APPLICATION", id: sellerProfileId }
    ).catch((error) => {
      console.error("Notification failed:", error);
    });
  }
};

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

  notifyAdminsOfNewSellerApplication(userId, seller.id).catch((error) => {
    console.error("Failed to notify admins of new seller application:", error);
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