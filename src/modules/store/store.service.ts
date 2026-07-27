import { ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { generateUniqueSlug } from "../../utils/slugify";
import {
  CreateStoreInput,
  UpdateStoreInput,
} from "./store.validation";

export const createStoreService = async (
  userId: string,
  data: CreateStoreInput
) => {
  const seller = await prisma.sellerProfile.findUnique({
    where: { userId },
  });

  if (!seller) {
    throw new AppError(
      "You must become a seller before creating a store.",
      403
    );
  }

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
  slug: string
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
    },
  });

  if (!store) {
    throw new AppError("Store not found.", 404);
  }

  return store;
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

  const where: any = {};

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

  if (!store) {
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
