import { CacCompanyType, Role, SellerStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { createNotificationService } from "../notification/notification.service";
import { READINESS_SELECT, READINESS_STEPS, missingSetup } from "../../utils/sellerReadiness";
import { isDojahConfigured } from "../../utils/dojah";
import { newSellerOrderLimit } from "../../utils/sellerReview";
import { heldAmountForStore } from "../payout/held-payout.service";
import { checkSellerCac } from "./cac-check.service";
import { createStoreService } from "../store/store.service";
import { QuickStartSellerInput } from "./seller.validation";

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
  cacNumber?: string,
  cacCompanyType?: CacCompanyType
) => {
  cacNumber = cacNumber || undefined;
  cacCompanyType = cacNumber ? cacCompanyType : undefined;

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
        cacCompanyType,
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
        cacNumber: cacNumber ?? null,
        cacCompanyType: cacCompanyType ?? null,
      },
    });

    if (
      cacNumberChanged(existingSeller.cacNumber, cacNumber) ||
      (existingSeller.cacCompanyType ?? null) !== (cacCompanyType ?? null)
    ) {
      await clearBusinessVerification(seller.id);
    }
  }

  // Look the number up on the CAC register straight away, so the admins
  // reviewing the application see what it says. (Without Dojah the
  // application notice is enough - no separate CAC notice.)
  if (cacNumber && isDojahConfigured()) {
    await checkSellerCac(seller.id);
    seller = (await prisma.sellerProfile.findUnique({ where: { id: seller.id } })) ?? seller;
  }

  notifyAdminsOfNewSellerApplication(userId, seller.id).catch((error) => {
    console.error("Failed to notify admins of new seller application:", error);
  });

  return seller;
};

const notifyAdminsOfQuickStart = async (userName: string, sellerProfileId: string, storeName: string) => {
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN, deletedAt: null }, select: { id: true } });
  await Promise.allSettled(
    admins.map((admin) =>
      createNotificationService(
        admin.id,
        "New seller to review",
        `${userName} started selling as "${storeName}". Their payouts are held and orders capped until you review them.`,
        undefined,
        { type: "ADMIN_SELLER_APPLICATION", id: sellerProfileId }
      )
    )
  );
};

/**
 * Quick start: a live store in one step. The seller is approved at once and
 * their store is marked underReview - payouts held, one order capped
 * (utils/sellerReview) - until an admin reviews them after the fact.
 *
 * - No seller profile yet, or an application still pending: approved now.
 * - Approved before (reviewed) but no store yet: the store is made, with no
 *   review needed.
 * - Rejected: no - rejected sellers go through the normal reapply route.
 */
export const quickStartSellerService = async (userId: string, data: QuickStartSellerInput) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, isGuest: true } });
  if (!user) throw new AppError("User not found.", 404);
  if (user.isGuest) throw new AppError("Set a password for your account first, then you can start selling.", 403);

  const existing = await prisma.sellerProfile.findUnique({ where: { userId }, include: { store: { select: { id: true } } } });

  if (existing?.status === SellerStatus.REJECTED) {
    throw new AppError(
      "Your seller application was rejected, so you can't use quick start. Reapply from this page once your waiting period ends.",
      403
    );
  }
  if (existing?.store) throw new AppError("You already have a store.", 400);

  const cacNumber = data.cacNumber || undefined;
  const cacCompanyType = cacNumber ? data.cacCompanyType : undefined;
  // Reviewed already: an admin approved them the old way before quick start.
  const alreadyReviewed = existing?.status === SellerStatus.APPROVED;

  const seller = existing
    ? await prisma.sellerProfile.update({
        where: { id: existing.id },
        data: {
          status: SellerStatus.APPROVED,
          statusReason: null,
          statusUpdatedAt: alreadyReviewed ? existing.statusUpdatedAt : new Date(),
          ...(cacNumber ? { cacNumber, cacCompanyType: cacCompanyType ?? null } : {}),
        },
      })
    : await prisma.sellerProfile.create({
        data: { userId, status: SellerStatus.APPROVED, statusUpdatedAt: new Date(), cacNumber, cacCompanyType },
      });

  let store;
  try {
    store = await createStoreService(
      userId,
      { name: data.storeName, instagram: data.instagram ?? undefined, whatsapp: data.whatsapp ?? undefined },
      { underReview: !alreadyReviewed }
    );
  } catch (error) {
    // Put the profile back as it was, so a retry isn't mistaken for a
    // seller an admin already approved (who'd skip the review).
    if (!alreadyReviewed) {
      await (existing
        ? prisma.sellerProfile.update({
            where: { id: existing.id },
            data: {
              status: existing.status,
              statusReason: existing.statusReason,
              statusUpdatedAt: existing.statusUpdatedAt,
              cacNumber: existing.cacNumber,
              cacCompanyType: existing.cacCompanyType,
            },
          })
        : prisma.sellerProfile.delete({ where: { id: seller.id } })
      ).catch((undoError) => console.error("Quick start: couldn't undo the seller profile:", undoError));
    }
    throw error;
  }

  // With the store named, the CAC lookup can also compare names.
  if (cacNumber && cacNumberChanged(existing?.cacNumber, cacNumber) && isDojahConfigured()) {
    await checkSellerCac(seller.id);
  }

  if (!alreadyReviewed) {
    notifyAdminsOfQuickStart(user.name, seller.id, store.name).catch((error) =>
      console.error("Failed to notify admins of a quick start:", error)
    );
  }

  return getSellerProfileService(userId);
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

  const underReview = !!seller.store?.underReview;
  return {
    ...withReapplyInfo(seller),
    // A store still under review: the most one order from it can be (naira).
    orderLimit: underReview ? newSellerOrderLimit() : null,
    // ...and what Nestly is holding for it until the review (naira).
    heldForReview: underReview && seller.store ? await heldAmountForStore(seller.store.id) : null,
  };
};

/**
 * What's left before buyers can order from this seller: store, payout
 * account, delivery zones (or pickup), a published product. Drives the
 * "Finish setting up" banner; empty `missing` means ready to sell.
 */
export const getSellerReadinessService = async (userId: string) => {
  const seller = await prisma.sellerProfile.findUnique({
    where: { userId },
    select: { status: true, ...READINESS_SELECT },
  });

  if (!seller) {
    throw new AppError("Seller profile not found.", 404);
  }

  const missing = seller.status === SellerStatus.APPROVED ? missingSetup(seller) : [];
  return {
    ready: missing.length === 0,
    missing: READINESS_STEPS.filter((step) => missing.includes(step.key)),
  };
};

export const updateSellerService = async (
  userId: string,
  data: { cacNumber?: string; cacCompanyType?: CacCompanyType }
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

  const nextNumber = data.cacNumber !== undefined ? data.cacNumber || null : seller.cacNumber;
  // The register belongs to the number: removing the number removes it.
  const nextType = !nextNumber
    ? null
    : data.cacCompanyType !== undefined
      ? data.cacCompanyType
      : data.cacNumber !== undefined && cacNumberChanged(seller.cacNumber, data.cacNumber)
        ? null
        : seller.cacCompanyType;

  const updated = await prisma.sellerProfile.update({
    where: {
      userId,
    },
    data: { cacNumber: nextNumber, cacCompanyType: nextType },
  });

  // Filling in the business type for a number that was verified before
  // types existed isn't a change worth dropping the badge over.
  const typeChanged =
    (seller.cacCompanyType ?? null) !== nextType && (seller.cacCompanyType !== null || !seller.isVerified);
  const changed = cacNumberChanged(seller.cacNumber, nextNumber) || typeChanged;

  if (!changed) return updated;

  // A new number (or register) needs checking afresh: drop the old
  // verification, then look the new one up (or clear the old result).
  await clearBusinessVerification(seller.id);
  await checkSellerCac(seller.id);
  return prisma.sellerProfile.findUniqueOrThrow({ where: { id: seller.id } });
};

const normaliseCac = (value?: string | null) => (value ?? "").replace(/\s+/g, "").toUpperCase();

const cacNumberChanged = (previous?: string | null, next?: string | null) =>
  normaliseCac(previous) !== normaliseCac(next);

// A verification only vouches for the number an admin actually checked, so
// a new CAC number drops it (and the store's public badge) until re-checked.
const clearBusinessVerification = async (sellerProfileId: string) => {
  await prisma.$transaction([
    prisma.sellerProfile.update({
      where: { id: sellerProfileId },
      // The last automatic check was for the old number too.
      data: { isVerified: false, cacCheckResult: null, cacCheckedName: null, cacCheckedStatus: null, cacCheckedAt: null },
    }),
    prisma.store.updateMany({ where: { sellerId: sellerProfileId }, data: { isVerified: false } }),
  ]);
};