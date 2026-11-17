import { Role, UserStatus, SellerStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { createNotificationService } from "../notification/notification.service";
import { SELLER_REAPPLY_COOLDOWN_DAYS } from "../seller/seller.service";
import { checkSellerCac } from "../seller/cac-check.service";
import { isDojahConfigured } from "../../utils/dojah";
import { openOrdersSummaryService, refundOpenOrdersForFraud } from "./seller-rejection.service";

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
  cacCompanyType: true,
  // The automatic CAC lookup: result, registered name and status, when.
  cacCheckResult: true,
  cacCheckedName: true,
  cacCheckedStatus: true,
  cacCheckedAt: true,
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
  // Shown next to the CAC number so the admin can compare it with the
  // name the CAC public search returns.
  // underReview: a quick-start store an admin hasn't reviewed yet - its
  // payouts are held and its orders capped until they do (utils/sellerReview).
  store: {
    select: { id: true, name: true, slug: true, isSuspended: true, underReview: true, createdAt: true },
  },
};

export const listSellersAdminService = async (
  page: number,
  limit: number,
  status?: SellerStatus,
  // Only quick-start sellers still waiting for a review.
  needsReview = false
) => {
  const skip = (page - 1) * limit;
  const where: any = {};

  if (status) where.status = status;
  if (needsReview) where.store = { underReview: true };

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

/**
 * Marks a seller's business as CAC-verified (or removes it) after an admin
 * has checked the number by hand on the CAC public search. The store's
 * public "verified" badge follows the same flag. Only sellers who supplied
 * a CAC number can be verified.
 */
export const setSellerVerifiedService = async (
  sellerId: string,
  isVerified: boolean
) => {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { id: true, userId: true, cacNumber: true, isVerified: true, store: { select: { id: true } } },
  });

  if (!seller) {
    throw new AppError("Seller profile not found.", 404);
  }

  if (isVerified && !seller.cacNumber?.trim()) {
    throw new AppError("This seller hasn't provided a CAC number to verify.", 400);
  }

  const [updated] = await prisma.$transaction([
    prisma.sellerProfile.update({
      where: { id: sellerId },
      data: { isVerified },
      select: ADMIN_SELLER_SELECT,
    }),
    ...(seller.store
      ? [prisma.store.update({ where: { id: seller.store.id }, data: { isVerified } })]
      : []),
  ]);

  // Only tell the seller when something actually changed.
  if (isVerified !== seller.isVerified) {
    await createNotificationService(
      seller.userId,
      isVerified ? "Business verified" : "Business verification removed",
      isVerified
        ? "Your business registration has been verified ✓ - buyers now see a verified badge on your store."
        : "Your business verification was removed. Contact support if you think this is a mistake.",
      undefined,
      { type: "SELLER_APPLICATION", id: seller.id }
    );
  }

  return updated;
};

/**
 * Runs the automatic CAC lookup (Dojah) again for a seller - e.g. after a
 * FAILED check or once the seller has fixed their details - and returns the
 * seller with the new result. Each lookup is a paid call on the live keys.
 */
export const recheckSellerCacService = async (sellerId: string) => {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { id: true, cacNumber: true },
  });

  if (!seller) {
    throw new AppError("Seller profile not found.", 404);
  }
  if (!seller.cacNumber?.trim()) {
    throw new AppError("This seller hasn't provided a CAC number to check.", 400);
  }
  if (!isDojahConfigured()) {
    throw new AppError("Automatic CAC checks aren't set up here (no Dojah keys). Check it by hand.", 503);
  }

  await checkSellerCac(sellerId);

  return prisma.sellerProfile.findUniqueOrThrow({
    where: { id: sellerId },
    select: ADMIN_SELLER_SELECT,
  });
};

/**
 * How a rejection treats orders already paid (admin/seller-rejection):
 * STOP_SALES (default) - the store stops taking orders, the seller finishes
 * the open ones and is paid for them as usual. FRAUD - undelivered orders
 * are cancelled and refunded; what's held stays held for the admins.
 */
export type RejectMode = "STOP_SALES" | "FRAUD";

/** Before rejecting: the seller's open orders and money held (all zero without a store). */
export const getSellerOpenOrdersService = async (sellerId: string) => {
  const store = await prisma.store.findUnique({ where: { sellerId }, select: { id: true } });
  if (!store) {
    return { openOrders: 0, openAmount: 0, refundableOrders: 0, refundableAmount: 0, manualOrders: 0, heldAmount: 0 };
  }
  return openOrdersSummaryService(store.id);
};

export const updateSellerStatusService = async (
  sellerId: string,
  status: SellerStatus,
  reason?: string,
  rejectMode: RejectMode = "STOP_SALES"
) => {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
  });

  if (!seller) {
    throw new AppError("Seller profile not found.", 404);
  }

  const now = new Date();
  const store = await prisma.store.findUnique({
    where: { sellerId },
    select: { id: true, name: true, underReview: true, salesStoppedAt: true },
  });
  // A quick-start seller already selling: approving is the review.
  const reviewing = status === SellerStatus.APPROVED && seller.status === SellerStatus.APPROVED && !!store?.underReview;
  const fraud = status === SellerStatus.REJECTED && rejectMode === "FRAUD";

  await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: {
      status,
      statusReason: status === SellerStatus.APPROVED ? null : reason,
      statusUpdatedAt: now,
    },
  });

  if (store) {
    const data =
      status === SellerStatus.APPROVED
        ? {
            // The review: safeguards go and held payouts are paid as usual.
            underReview: false,
            // Approved again after "stop new sales": the store reopens.
            ...(store.salesStoppedAt ? { isSuspended: false, salesStoppedAt: null } : {}),
          }
        : fraud
          ? // Down at once; nothing held is paid out until an admin decides.
            { isSuspended: true, salesStoppedAt: null, underReview: true }
          : // No new orders; the open ones are finished and paid as usual.
            { isSuspended: true, salesStoppedAt: now, underReview: false };
    await prisma.store.update({ where: { id: store.id }, data });
  }

  const refunds = fraud && store ? await refundOpenOrdersForFraud(store.id, store.name) : null;

  const updated = {
    ...(await prisma.sellerProfile.findUniqueOrThrow({
      where: { id: sellerId },
      select: ADMIN_SELLER_SELECT,
    })),
    // Fraud rejections: what was refunded automatically.
    refunds,
  };

  if (reviewing) {
    await createNotificationService(
      seller.userId,
      "Your store has been reviewed ✅",
      `${store!.name} is fully set up: payouts are released as usual and the order limit for new stores no longer applies.`,
      undefined,
      { type: "SELLER_EARNINGS", id: store!.id }
    );
    return updated;
  }

  const reapplyMessage =
    status === SellerStatus.REJECTED
      ? `${
          !store
            ? ""
            : fraud
              ? " Your store has been closed and orders not yet delivered were cancelled and refunded to the buyers."
              : " Your store no longer takes new orders, but you can still finish the orders already paid: Seller Hub → Orders. You're paid for them as usual."
        } You can reapply in ${SELLER_REAPPLY_COOLDOWN_DAYS} days.`
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

/**
 * Products in any status (drafts and archived too), newest edit first,
 * with how many times each has been edited. Search matches the title, SKU
 * or store name.
 */
export const listProductsAdminService = async (
  page: number,
  limit: number,
  search?: string
) => {
  const skip = (page - 1) * limit;
  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { store: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        sku: true,
        status: true,
        price: true,
        isFeatured: true,
        updatedAt: true,
        reviewsResetAt: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        store: { select: { id: true, name: true, slug: true } },
        _count: { select: { revisions: true, reviews: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Every saved edit to one product - what changed, who made it and when -
 * newest first. For disputes and spotting sellers who switch listings.
 */
export const getProductHistoryAdminService = async (
  productId: string,
  page: number,
  limit: number
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      reviewsResetAt: true,
      store: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  const skip = (page - 1) * limit;

  const [revisions, total] = await Promise.all([
    prisma.productRevision.findMany({
      where: { productId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        changes: true,
        reviewsReset: true,
        createdAt: true,
        editedBy: { select: { id: true, name: true, username: true } },
      },
    }),
    prisma.productRevision.count({ where: { productId } }),
  ]);

  return {
    product,
    revisions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Featured products appear in the marketplace's featured sections. Only
 * admins choose them - sellers can't feature their own.
 */
export const setProductFeaturedAdminService = async (productId: string, isFeatured: boolean) => {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new AppError("Product not found.", 404);

  return prisma.product.update({
    where: { id: productId },
    data: { isFeatured },
    select: { id: true, title: true, isFeatured: true },
  });
};
