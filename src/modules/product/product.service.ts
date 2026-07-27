import { ProductCondition, ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { generateUniqueSlug } from "../../utils/slugify";
import { getSellerStore } from "../seller/seller.utils";
import {
  CreateProductInput,
  UpdateProductInput,
} from "./product.validation";

const PRIMARY_IMAGE_INCLUDE = {
  images: { where: { isPrimary: true }, take: 1 },
};

const FULL_PRODUCT_INCLUDE = {
  images: true,
  specifications: true,
  variants: true,
  category: true,
};

export const createProductService = async (
  userId: string,
  data: CreateProductInput
) => {
  const store = await getSellerStore(userId);

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new AppError("Category not found.", 404);
  }

  const existingSku = await prisma.product.findUnique({
    where: { sku: data.sku },
  });

  if (existingSku) {
    throw new AppError("SKU already in use.", 400);
  }

  const slug = await generateUniqueSlug(
    data.title,
    async (candidate) => {
      const found = await prisma.product.findUnique({
        where: { slug: candidate },
      });
      return !!found;
    }
  );

  const {
    images,
    specifications,
    variants,
    categoryId,
    ...fields
  } = data;

  return prisma.product.create({
    data: {
      ...fields,
      slug,
      storeId: store.id,
      categoryId,
      images: images ? { create: images } : undefined,
      specifications: specifications
        ? { create: specifications }
        : undefined,
      variants: variants
        ? { create: variants }
        : undefined,
    },
    include: FULL_PRODUCT_INCLUDE,
  });
};

export const updateProductService = async (
  userId: string,
  productId: string,
  data: UpdateProductInput
) => {
  const store = await getSellerStore(userId);

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  if (product.storeId !== store.id) {
    throw new AppError(
      "You are not authorized to update this product.",
      403
    );
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new AppError("Category not found.", 404);
    }
  }

  if (data.sku && data.sku !== product.sku) {
    const skuTaken = await prisma.product.findFirst({
      where: {
        sku: data.sku,
        NOT: { id: productId },
      },
    });

    if (skuTaken) {
      throw new AppError("SKU already in use.", 400);
    }
  }

  let slug = product.slug;

  if (data.title && data.title !== product.title) {
    slug = await generateUniqueSlug(
      data.title,
      async (candidate) => {
        const found = await prisma.product.findFirst({
          where: {
            slug: candidate,
            NOT: { id: productId },
          },
        });
        return !!found;
      }
    );
  }

  const { images, specifications, variants, ...fields } =
    data;

  return prisma.$transaction(async (tx) => {
    if (images) {
      await tx.productImage.deleteMany({
        where: { productId },
      });
    }

    if (specifications) {
      await tx.productSpecification.deleteMany({
        where: { productId },
      });
    }

    if (variants) {
      await tx.productVariant.deleteMany({
        where: { productId },
      });
    }

    return tx.product.update({
      where: { id: productId },
      data: {
        ...fields,
        slug,
        images: images ? { create: images } : undefined,
        specifications: specifications
          ? { create: specifications }
          : undefined,
        variants: variants
          ? { create: variants }
          : undefined,
      },
      include: FULL_PRODUCT_INCLUDE,
    });
  });
};

export const archiveProductService = async (
  userId: string,
  productId: string
) => {
  const store = await getSellerStore(userId);

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  if (product.storeId !== store.id) {
    throw new AppError(
      "You are not authorized to delete this product.",
      403
    );
  }

  return prisma.product.update({
    where: { id: productId },
    data: { status: ProductStatus.ARCHIVED },
  });
};

interface ProductFilters {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: ProductCondition;
  brand?: string;
  sort?: string;
}

export const getProductsService = async (
  filters: ProductFilters
) => {
  const {
    page,
    limit,
    search,
    category,
    minPrice,
    maxPrice,
    condition,
    brand,
    sort,
  } = filters;

  const skip = (page - 1) * limit;

  const where: any = { status: ProductStatus.PUBLISHED };

  if (search) {
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (category) {
    where.category = { slug: category };
  }

  if (condition) {
    where.condition = condition;
  }

  if (brand) {
    where.brand = { equals: brand, mode: "insensitive" };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  const orderBy =
    sort === "price_asc"
      ? { price: "asc" as const }
      : sort === "price_desc"
      ? { price: "desc" as const }
      : sort === "oldest"
      ? { createdAt: "asc" as const }
      : { createdAt: "desc" as const };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        ...PRIMARY_IMAGE_INCLUDE,
        category: {
          select: { id: true, name: true, slug: true },
        },
        store: {
          select: { id: true, name: true, slug: true },
        },
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

export const getPublicProductByIdService = async (
  id: string
) => {
  const product = await prisma.product.findFirst({
    where: { id, status: ProductStatus.PUBLISHED },
    include: {
      ...FULL_PRODUCT_INCLUDE,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true,
        },
      },
    },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  return product;
};

export const getFeaturedProductsService = async (
  limit: number
) => {
  return prisma.product.findMany({
    where: {
      isFeatured: true,
      status: ProductStatus.PUBLISHED,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      ...PRIMARY_IMAGE_INCLUDE,
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
};

export const getNearbyProductsService = async (
  city: string | undefined,
  state: string | undefined,
  page: number,
  limit: number
) => {
  if (!city && !state) {
    throw new AppError(
      "Provide a city or state to find nearby products.",
      400
    );
  }

  const skip = (page - 1) * limit;

  const storeFilter: any = {};
  if (city) storeFilter.city = { equals: city, mode: "insensitive" };
  if (state) storeFilter.state = { equals: state, mode: "insensitive" };

  const where = {
    status: ProductStatus.PUBLISHED,
    store: storeFilter,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        ...PRIMARY_IMAGE_INCLUDE,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
          },
        },
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

export const getRelatedProductsService = async (
  productId: string,
  limit: number
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  return prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      status: ProductStatus.PUBLISHED,
      NOT: { id: productId },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      ...PRIMARY_IMAGE_INCLUDE,
      store: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
};

export const getSellerProductsService = async (
  userId: string,
  page: number,
  limit: number,
  status?: ProductStatus
) => {
  const store = await getSellerStore(userId);

  const skip = (page - 1) * limit;

  const where: any = { storeId: store.id };
  if (status) where.status = status;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        ...PRIMARY_IMAGE_INCLUDE,
        category: {
          select: { id: true, name: true, slug: true },
        },
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

export const getSellerProductByIdService = async (
  userId: string,
  productId: string
) => {
  const store = await getSellerStore(userId);

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    include: FULL_PRODUCT_INCLUDE,
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  return product;
};
