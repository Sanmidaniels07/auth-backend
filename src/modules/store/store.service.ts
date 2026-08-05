import { ProductStatus, Role } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { generateUniqueSlug } from "../../utils/slugify";
import { getApprovedSellerProfile } from "../seller/seller.utils";
import {
  resolveBankAccount,
  createOrUpdateSubaccount,
  listPaystackBanks,
} from "../../utils/paystack";
import { sendEmail } from "../auth/email.services";
import { payoutAccountChangedTemplate } from "../../templates/payout-account-changed.template";
import { createNotificationService } from "../notification/notification.service";
import {
  CreateStoreInput,
  UpdateStoreInput,
} from "./store.validation";

// A newly changed payout account isn't eligible for automatic checkout
// splits until this many hours have passed - see buildPendingOrder in
// checkout.service.ts, which falls back to the manual Payout ledger for
// stores still inside this window. Gives admin/the seller a chance to
// catch and reverse a fraudulent change before real money moves.
export const PAYOUT_ACCOUNT_HOLD_HOURS = 48;

export const isPayoutAccountEligibleForSplit = (store: {
  paystackSubaccountCode: string | null;
  payoutAccountUpdatedAt: Date | null;
}) => {
  if (!store.paystackSubaccountCode) return false;
  if (!store.payoutAccountUpdatedAt) return true;

  const holdUntil =
    store.payoutAccountUpdatedAt.getTime() +
    PAYOUT_ACCOUNT_HOLD_HOURS * 60 * 60 * 1000;

  return Date.now() >= holdUntil;
};

const maskAccountNumber = (accountNumber: string) =>
  `••••${accountNumber.slice(-4)}`;

const notifyPayoutAccountChanged = async (
  userId: string,
  store: { id: string; name: string },
  bankName: string,
  accountNumber: string
) => {
  const [user, admins] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    }),
  ]);

  if (!user) return;

  sendEmail(
    user.email,
    "Your payout account was changed",
    payoutAccountChangedTemplate(
      user.name,
      store.name,
      bankName,
      maskAccountNumber(accountNumber),
      `${process.env.FRONTEND_URL}/settings/marketplace?tab=store`
    )
  ).catch((error) => {
    console.error("Payout account change email failed:", error);
  });

  for (const admin of admins) {
    createNotificationService(
      admin.id,
      "Payout account changed",
      `${user.name} changed the payout account for "${store.name}" to ${bankName} (${maskAccountNumber(accountNumber)}).`,
      undefined,
      { type: "ADMIN_PAYOUT_ACCOUNT_CHANGED", id: store.id }
    ).catch((error) => {
      console.error("Notification failed:", error);
    });
  }
};

const getOwnedStoreBySlug = async (
  userId: string,
  slug: string
) => {
  const seller = await getApprovedSellerProfile(userId);

  const store = await prisma.store.findUnique({
    where: { slug },
  });

  if (!store) {
    throw new AppError("Store not found.", 404);
  }

  if (store.sellerId !== seller.id) {
    throw new AppError(
      "You are not authorized to manage this store.",
      403
    );
  }

  return store;
};

export const createStoreService = async (
  userId: string,
  data: CreateStoreInput
) => {
  const seller = await getApprovedSellerProfile(userId);

  const existingStore = await prisma.store.findUnique({
    where: { sellerId: seller.id },
  });

  if (existingStore) {
    throw new AppError(
      "You already have a store.",
      400
    );
  }

  const slug = await generateUniqueSlug(
    data.name,
    async (candidate) => {
      const found = await prisma.store.findUnique({
        where: { slug: candidate },
      });
      return !!found;
    }
  );

  return prisma.store.create({
    data: {
      ...data,
      slug,
      sellerId: seller.id,
    },
  });
};

export const updateStoreService = async (
  userId: string,
  storeId: string,
  data: UpdateStoreInput
) => {
  const seller = await getApprovedSellerProfile(userId);

  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    throw new AppError("Store not found.", 404);
  }

  if (store.sellerId !== seller.id) {
    throw new AppError(
      "You are not authorized to update this store.",
      403
    );
  }

  let slug = store.slug;

  if (data.name && data.name !== store.name) {
    slug = await generateUniqueSlug(
      data.name,
      async (candidate) => {
        const found = await prisma.store.findFirst({
          where: {
            slug: candidate,
            NOT: { id: storeId },
          },
        });
        return !!found;
      }
    );
  }

  return prisma.store.update({
    where: { id: storeId },
    data: {
      ...data,
      slug,
    },
  });
};

export const setupPayoutAccountService = async (
  userId: string,
  slug: string,
  bankCode: string,
  accountNumber: string
) => {
  const store = await getOwnedStoreBySlug(userId, slug);

  const banks = await listPaystackBanks();
  const bank = banks.find((b) => b.code === bankCode);

  if (!bank) {
    throw new AppError("Unknown bank.", 400);
  }

  const resolved = await resolveBankAccount(accountNumber, bankCode);

  const subaccount = await createOrUpdateSubaccount({
    businessName: store.name,
    bankCode,
    accountNumber,
    existingSubaccountCode: store.paystackSubaccountCode,
  });

  const [updated] = await prisma.$transaction([
    prisma.store.update({
      where: { id: store.id },
      data: {
        payoutBankName: bank.name,
        payoutBankCode: bankCode,
        payoutAccountNumber: accountNumber,
        payoutAccountName: resolved.account_name,
        paystackSubaccountCode: subaccount.subaccount_code,
        payoutAccountUpdatedAt: new Date(),
      },
    }),
    prisma.payoutAccountChange.create({
      data: {
        storeId: store.id,
        previousBankName: store.payoutBankName,
        previousAccountNumber: store.payoutAccountNumber,
        newBankName: bank.name,
        newAccountNumber: accountNumber,
      },
    }),
  ]);

  notifyPayoutAccountChanged(userId, store, bank.name, accountNumber).catch(
    (error) => {
      console.error("Failed to notify of payout account change:", error);
    }
  );

  return updated;
};

export const getPublicStoreService = async (
  slug: string,
  viewerId?: string
) => {
  const store = await prisma.store.findUnique({
    where: { slug },
    include: {
      seller: {
        select: {
          id: true,
          status: true,
          isVerified: true,
          user: {
            select: { id: true, name: true },
          },
        },
      },
      shippingOptions: true,
      _count: {
        select: { followers: true },
      },
    },
  });

  if (!store || store.isSuspended) {
    throw new AppError("Store not found.", 404);
  }

  let isFollowing = false;

  if (viewerId) {
    const follow = await prisma.storeFollow.findUnique({
      where: {
        userId_storeId: { userId: viewerId, storeId: store.id },
      },
    });
    isFollowing = !!follow;
  }

  // Don't count the owner's own visits; anonymous viewers are logged with a null viewerId.
  if (viewerId !== store.seller.user.id) {
    await prisma.storeView.create({
      data: {
        storeId: store.id,
        viewerId: viewerId ?? null,
      },
    });
  }

  const { _count, ...rest } = store;

  return {
    ...rest,
    followersCount: _count.followers,
    isFollowing,
  };
};

export const followStoreService = async (
  userId: string,
  slug: string
) => {
  const store = await prisma.store.findUnique({
    where: { slug },
  });

  if (!store) {
    throw new AppError("Store not found.", 404);
  }

  const existing = await prisma.storeFollow.findUnique({
    where: {
      userId_storeId: { userId, storeId: store.id },
    },
  });

  if (existing) {
    throw new AppError(
      "You are already following this store.",
      400
    );
  }

  return prisma.storeFollow.create({
    data: { userId, storeId: store.id },
  });
};

export const unfollowStoreService = async (
  userId: string,
  slug: string
) => {
  const store = await prisma.store.findUnique({
    where: { slug },
  });

  if (!store) {
    throw new AppError("Store not found.", 404);
  }

  const existing = await prisma.storeFollow.findUnique({
    where: {
      userId_storeId: { userId, storeId: store.id },
    },
  });

  if (!existing) {
    throw new AppError(
      "You are not following this store.",
      404
    );
  }

  await prisma.storeFollow.delete({
    where: { id: existing.id },
  });
};

export const getStoreFollowStatusService = async (
  userId: string,
  slug: string
) => {
  const store = await prisma.store.findUnique({
    where: { slug },
  });

  if (!store) {
    throw new AppError("Store not found.", 404);
  }

  const existing = await prisma.storeFollow.findUnique({
    where: {
      userId_storeId: { userId, storeId: store.id },
    },
  });

  return { isFollowing: !!existing };
};

export const getSellerStoreService = async (
  userId: string
) => {
  const seller = await prisma.sellerProfile.findUnique({
    where: { userId },
  });

  if (!seller) {
    throw new AppError(
      "Seller profile not found.",
      404
    );
  }

  const store = await prisma.store.findUnique({
    where: { sellerId: seller.id },
  });

  if (!store) {
    throw new AppError(
      "You have not created a store yet.",
      404
    );
  }

  return {
    ...store,
    isOnHold:
      !!store.paystackSubaccountCode &&
      !isPayoutAccountEligibleForSplit(store),
    holdHours: PAYOUT_ACCOUNT_HOLD_HOURS,
  };
};

export const listStoresService = async (
  page: number,
  limit: number,
  search?: string,
  city?: string
) => {
  const skip = (page - 1) * limit;

  const where: any = { isSuspended: false };

  if (search) {
    where.name = {
      contains: search,
      mode: "insensitive",
    };
  }

  if (city) {
    where.city = {
      equals: city,
      mode: "insensitive",
    };
  }

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.store.count({ where }),
  ]);

  return {
    stores,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getStoreProductsService = async (
  slug: string,
  page: number,
  limit: number
) => {
  const store = await prisma.store.findUnique({
    where: { slug },
  });

  if (!store || store.isSuspended) {
    throw new AppError("Store not found.", 404);
  }

  const skip = (page - 1) * limit;

  const where = {
    storeId: store.id,
    status: ProductStatus.PUBLISHED,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
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

interface ShippingOptionInput {
  name: string;
  fee: number;
  etaDays?: number;
}

export const createShippingOptionService = async (
  userId: string,
  slug: string,
  data: ShippingOptionInput
) => {
  const store = await getOwnedStoreBySlug(userId, slug);

  return prisma.shippingOption.create({
    data: { ...data, storeId: store.id },
  });
};

export const updateShippingOptionService = async (
  userId: string,
  slug: string,
  optionId: string,
  data: Partial<ShippingOptionInput>
) => {
  const store = await getOwnedStoreBySlug(userId, slug);

  const option = await prisma.shippingOption.findUnique({
    where: { id: optionId },
  });

  if (!option || option.storeId !== store.id) {
    throw new AppError("Shipping option not found.", 404);
  }

  return prisma.shippingOption.update({
    where: { id: optionId },
    data,
  });
};

export const deleteShippingOptionService = async (
  userId: string,
  slug: string,
  optionId: string
) => {
  const store = await getOwnedStoreBySlug(userId, slug);

  const option = await prisma.shippingOption.findUnique({
    where: { id: optionId },
  });

  if (!option || option.storeId !== store.id) {
    throw new AppError("Shipping option not found.", 404);
  }

  await prisma.shippingOption.delete({
    where: { id: optionId },
  });
};

export const setStoreVerifiedService = async (
  storeId: string,
  isVerified: boolean
) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    throw new AppError("Store not found.", 404);
  }

  return prisma.store.update({
    where: { id: storeId },
    data: { isVerified },
  });
};
