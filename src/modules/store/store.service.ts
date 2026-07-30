import { ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { generateUniqueSlug } from "../../utils/slugify";
import { getApprovedSellerProfile } from "../seller/seller.utils";
import {
  CreateStoreInput,
  UpdateStoreInput,
} from "./store.validation";

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

  return store;
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
