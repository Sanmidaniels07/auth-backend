import { Role, SellerStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { createNotificationService } from "../notification/notification.service";

export const SELLER_REAPPLY_COOLDOWN_DAYS = 3;

const getReapplyEligibleAt = (seller: {
  status: SellerStatus;
  statusUpdatedAt: Date | null;
}) => {
  if (seller.status !== SellerStatus.REJECTED) {
    return null;
  }

  const rejectedAt = seller.statusUpdatedAt ?? new Date();

  return new Date(
    rejectedAt.getTime() +
      SELLER_REAPPLY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  );
};

const withReapplyInfo = <
  T extends { status: SellerStatus; statusUpdatedAt: Date | null }
>(
  seller: T
) => {
  const reapplyEligibleAt = getReapplyEligibleAt(seller);

  return {
    ...seller,
    reapplyEligibleAt,
    canReapply: reapplyEligibleAt
      ? reapplyEligibleAt.getTime() <= Date.now()
      : false,
  };
};

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

  let seller;

  if (!existingSeller) {
    seller = await prisma.sellerProfile.create({
      data: {
        userId,
        cacNumber,
      },
    });
  } else if (existingSeller.status === SellerStatus.PENDING) {
    throw new AppError(
      "You already have a seller application pending review.",
      400
    );
  } else if (existingSeller.status === SellerStatus.APPROVED) {
    throw new AppError(
      "You already have a seller profile.",
      400
    );
  } else {
    // REJECTED - allow reapplying once the cooldown has elapsed.
    const eligibleAt = getReapplyEligibleAt(existingSeller);

    if (eligibleAt && eligibleAt.getTime() > Date.now()) {
      throw new AppError(
        `You can reapply to become a seller on ${eligibleAt.toISOString()}.`,
        403
      );
    }

    seller = await prisma.sellerProfile.update({
      where: { userId },
      data: {
        status: SellerStatus.PENDING,
        statusReason: null,
        statusUpdatedAt: new Date(),
        cacNumber,
      },
    });
  }

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

  return withReapplyInfo(seller);
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