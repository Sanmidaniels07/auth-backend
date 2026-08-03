import { Role, UserStatus, SellerStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { createNotificationService } from "../notification/notification.service";
import { SELLER_REAPPLY_COOLDOWN_DAYS } from "../seller/seller.service";

const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  status: true,
  statusReason: true,
};

export const updateUserRoleService = async (
  adminUserId: string,
  targetUserId: string,
  role: Role
) => {
  if (adminUserId === targetUserId) {
    throw new AppError(
      "You cannot change your own role. Have another admin do it.",
      400
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: ADMIN_USER_SELECT,
  });
};

export const updateUserStatusService = async (
  adminUserId: string,
  targetUserId: string,
  status: UserStatus,
  reason?: string
) => {
  if (adminUserId === targetUserId) {
    throw new AppError(
      "You cannot change your own account status. Have another admin do it.",
      400
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: {
        status,
        statusReason: status === UserStatus.ACTIVE ? null : reason,
      },
      select: ADMIN_USER_SELECT,
    });

    // Force logout everywhere - a suspended/banned user shouldn't be able
    // to refresh into a new access token while their status is not ACTIVE.
    if (status !== UserStatus.ACTIVE) {
      await tx.session.deleteMany({ where: { userId: targetUserId } });
    }

    // If this user is a seller, suspending/banning them also pulls their
    // store out of marketplace browsing; reactivating them un-suspends it.
    const sellerProfile = await tx.sellerProfile.findUnique({
      where: { userId: targetUserId },
      include: { store: true },
    });

    let storeSuspended: boolean | null = null;

    if (sellerProfile?.store) {
      const updatedStore = await tx.store.update({
        where: { id: sellerProfile.store.id },
        data: { isSuspended: status !== UserStatus.ACTIVE },
      });
      storeSuspended = updatedStore.isSuspended;
    }

    return { ...updated, storeSuspended };
  });
};

interface AdminUserFilters {
  page: number;
  limit: number;
  search?: string;
  role?: Role;
  status?: UserStatus;
}

export const listUsersAdminService = async (
  filters: AdminUserFilters
) => {
  const { page, limit, search, role, status } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role) where.role = role;
  if (status) where.status = status;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        ...ADMIN_USER_SELECT,
        isVerified: true,
        createdAt: true,
        deletedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const ADMIN_SELLER_SELECT = {
  id: true,
  status: true,
  statusReason: true,
  statusUpdatedAt: true,
  cacNumber: true,
  isVerified: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
    },
  },
};

export const listSellersAdminService = async (
  page: number,
  limit: number,
  status?: SellerStatus
) => {
  const skip = (page - 1) * limit;
  const where: any = {};

  if (status) where.status = status;

  const [sellers, total] = await Promise.all([
    prisma.sellerProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: ADMIN_SELLER_SELECT,
    }),
    prisma.sellerProfile.count({ where }),
  ]);

  return {
    sellers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const updateSellerStatusService = async (
  sellerId: string,
  status: SellerStatus,
  reason?: string
) => {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
  });

  if (!seller) {
    throw new AppError("Seller profile not found.", 404);
  }

  const now = new Date();

  const updated = await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: {
      status,
      statusReason: status === SellerStatus.APPROVED ? null : reason,
      statusUpdatedAt: now,
    },
    select: ADMIN_SELLER_SELECT,
  });

  const reapplyMessage =
    status === SellerStatus.REJECTED
      ? ` You can reapply in ${SELLER_REAPPLY_COOLDOWN_DAYS} days.`
      : "";

  await createNotificationService(
    seller.userId,
    status === SellerStatus.APPROVED
      ? "Seller application approved"
      : "Seller application rejected",
    status === SellerStatus.APPROVED
      ? "Your seller application has been approved. You can now create your store."
      : `Your seller application was rejected.${reason ? ` Reason: ${reason}` : ""}${reapplyMessage}`,
    undefined,
    { type: "SELLER_APPLICATION", id: seller.id }
  );

  return updated;
};
