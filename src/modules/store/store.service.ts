import { Prisma, ProductStatus, Role } from "@prisma/client";

import { DeliveryVehicle, ShippingOptionType } from "@prisma/client";
import prisma from "../../prisma/prisma";
import { findState } from "../../data/nigeria-locations";
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
      // Buyers only see active zones.
      shippingOptions: {
        where: { isArchived: false },
        orderBy: { fee: "asc" },
      },
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

  // Payout details are the seller's alone (they get them from /stores/me) -
  // never send bank details or the Paystack subaccount to the public.
  const {
    _count,
    payoutBankName: _bankName,
    payoutBankCode: _bankCode,
    payoutAccountNumber: _accountNumber,
    payoutAccountName: _accountName,
    paystackSubaccountCode: _subaccount,
    payoutAccountUpdatedAt: _payoutUpdatedAt,
    ...rest
  } = store;

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
    // The seller manages every zone, including archived ones.
    include: {
      shippingOptions: { orderBy: [{ isArchived: "asc" }, { fee: "asc" }] },
    },
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

// Public store listing fields only - payout bank details and the Paystack
// subaccount code must never leave the server on this unauthenticated route.
const PUBLIC_STORE_LIST_SELECT = {
  id: true,
  sellerId: true,
  name: true,
  slug: true,
  description: true,
  logo: true,
  banner: true,
  city: true,
  state: true,
  country: true,
  rating: true,
  isVerified: true,
  createdAt: true,
  _count: {
    select: {
      products: { where: { status: ProductStatus.PUBLISHED } },
      followers: true,
    },
  },
  // A few products so listings can preview what the store sells.
  products: {
    where: { status: ProductStatus.PUBLISHED },
    orderBy: { createdAt: "desc" as const },
    take: 3,
    select: {
      id: true,
      title: true,
      price: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  },
} satisfies Prisma.StoreSelect;

export const listStoresService = async (
  page: number,
  limit: number,
  search?: string,
  city?: string,
  sort: "newest" | "trending" = "newest"
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.StoreWhereInput = { isSuspended: false };

  // Trending only makes sense for stores buyers can actually shop from.
  if (sort === "trending") {
    where.products = { some: { status: ProductStatus.PUBLISHED } };
  }

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

  const orderBy: Prisma.StoreOrderByWithRelationInput[] =
    sort === "trending"
      ? [
          { storeViews: { _count: "desc" } },
          { followers: { _count: "desc" } },
          { createdAt: "desc" },
        ]
      : [{ createdAt: "desc" }];

  const [rows, total] = await Promise.all([
    prisma.store.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: PUBLIC_STORE_LIST_SELECT,
    }),
    prisma.store.count({ where }),
  ]);

  const stores = rows.map(({ _count, products, ...store }) => ({
    ...store,
    productCount: _count.products,
    followersCount: _count.followers,
    previewProducts: products.map((product) => ({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.images[0]?.url ?? null,
    })),
  }));

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
  name?: string;
  fee: number;
  eta?: string;
  areas?: string[];
  state?: string;
  type?: ShippingOptionType;
  pickupAddress?: string;
  vehicle?: DeliveryVehicle;
}

const PICKUP_DEFAULT_NAME = "Pick up from seller";

const MAX_ZONES_PER_STORE = 100;

// Trims, de-duplicates (case-insensitively) and keeps the seller's order.
const cleanAreas = (areas: string[] = []) => {
  const seen = new Set<string>();
  return areas
    .map((area) => area.trim().replace(/\s+/g, " "))
    .filter((area) => {
      const key = area.toLowerCase();
      if (!area || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

// Shapes a zone for saving: the name defaults to its areas joined, and the
// state is stored under its canonical name when it's a known state.
// Pickup is always free and covers no areas - the buyer comes to the seller.
const toZoneData = (data: ShippingOptionInput) => {
  if (data.type === ShippingOptionType.PICKUP) {
    return {
      type: ShippingOptionType.PICKUP,
      name: data.name?.trim() || PICKUP_DEFAULT_NAME,
      fee: 0,
      eta: data.eta,
      areas: [],
      state: data.state ? findState(data.state)?.name ?? data.state.trim() : undefined,
      pickupAddress: data.pickupAddress?.trim() || undefined,
      vehicle: null,
    };
  }

  const areas = cleanAreas(data.areas);
  const name = data.name?.trim() || areas.join(" / ");

  return {
    type: ShippingOptionType.DELIVERY,
    name,
    fee: data.fee,
    eta: data.eta,
    areas,
    state: data.state ? findState(data.state)?.name ?? data.state.trim() : undefined,
    vehicle: data.vehicle ?? null,
  };
};

const assertZoneCapacity = async (storeId: string, adding: number) => {
  const existing = await prisma.shippingOption.count({ where: { storeId } });

  if (existing + adding > MAX_ZONES_PER_STORE) {
    throw new AppError(
      `A store can have up to ${MAX_ZONES_PER_STORE} shipping zones. Delete or merge some first.`,
      400
    );
  }
};

// The store's address as one line, used where a pickup option has none.
export const storePickupAddress = (store: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
}) => [store.address, store.city, store.state].filter(Boolean).join(", ") || null;

export const createShippingOptionService = async (
  userId: string,
  slug: string,
  data: ShippingOptionInput
) => {
  const store = await getOwnedStoreBySlug(userId, slug);
  await assertZoneCapacity(store.id, 1);

  return prisma.shippingOption.create({
    data: { ...toZoneData(data), storeId: store.id },
  });
};

// Saves several zones at once - e.g. a seller pricing the suggested zones
// for their state in one go.
export const bulkCreateShippingOptionsService = async (
  userId: string,
  slug: string,
  options: ShippingOptionInput[]
) => {
  const store = await getOwnedStoreBySlug(userId, slug);
  await assertZoneCapacity(store.id, options.length);

  return prisma.shippingOption.createManyAndReturn({
    data: options.map((option) => ({ ...toZoneData(option), storeId: store.id })),
  });
};

interface ShippingOptionUpdate extends Partial<Omit<ShippingOptionInput, "eta" | "pickupAddress" | "vehicle">> {
  eta?: string | null;
  pickupAddress?: string | null;
  vehicle?: ShippingOptionInput["vehicle"] | null;
  isArchived?: boolean;
}

export const updateShippingOptionService = async (
  userId: string,
  slug: string,
  optionId: string,
  data: ShippingOptionUpdate
) => {
  const store = await getOwnedStoreBySlug(userId, slug);

  const option = await prisma.shippingOption.findUnique({
    where: { id: optionId },
  });

  if (!option || option.storeId !== store.id) {
    throw new AppError("Shipping option not found.", 404);
  }

  const isPickup = (data.type ?? option.type) === ShippingOptionType.PICKUP;
  const switchingToPickup = isPickup && option.type !== ShippingOptionType.PICKUP;
  const areas = isPickup ? [] : data.areas !== undefined ? cleanAreas(data.areas) : undefined;
  const nextAreas = areas ?? option.areas;
  const name = data.name?.trim() || (areas?.length ? areas.join(" / ") : undefined);

  if (!isPickup && !(name ?? option.name) && nextAreas.length === 0) {
    throw new AppError("Give the zone a name or pick at least one area.", 400);
  }

  return prisma.shippingOption.update({
    where: { id: optionId },
    data: {
      type: data.type,
      name: name ?? (switchingToPickup ? PICKUP_DEFAULT_NAME : undefined),
      // Pickup is always free, whatever was sent.
      fee: isPickup ? 0 : data.fee,
      eta: data.eta,
      areas,
      state: data.state ? findState(data.state)?.name ?? data.state.trim() : undefined,
      pickupAddress: isPickup ? (data.pickupAddress === null ? null : data.pickupAddress?.trim()) : null,
      // Pickup has no vehicle - the buyer collects.
      vehicle: isPickup ? null : data.vehicle,
      isArchived: data.isArchived,
    },
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
