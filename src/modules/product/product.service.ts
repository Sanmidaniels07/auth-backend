import { ProductCondition, ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { generateUniqueSlug } from "../../utils/slugify";
import { getSellerStore } from "../seller/seller.utils";
import { findState, stateSpellings } from "../../data/nigeria-locations";
import { OPTIONS_INCLUDE, assertValidOptions, saveProductOptions } from "../../utils/productOptions";
import { diffProducts, isDifferentProduct, recordProductRevision, recordStatusChanges } from "../../utils/productHistory";
import { isAdminUser } from "../../utils/isAdmin";
import {
  CreateProductInput,
  UpdateProductInput,
} from "./product.validation";

const PRIMARY_IMAGE_INCLUDE = {
  images: { where: { isPrimary: true }, take: 1 },
};

// Prisma cancels an interactive transaction after 5s by default. Each query
// to the production database is a long round trip, so saving a product
// with photos, specs and options needs more room than that.
const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

const FULL_PRODUCT_INCLUDE = {
  images: true,
  specifications: true,
  ...OPTIONS_INCLUDE,
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
    options,
    variations,
    categoryId,
    ...fields
  } = data;

  if (options && variations) assertValidOptions(options, variations);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        ...fields,
        slug,
        storeId: store.id,
        categoryId,
        images: images ? { create: images } : undefined,
        specifications: specifications
          ? { create: specifications }
          : undefined,
      },
    });

    if (options && variations && options.length > 0) {
      const stock = await saveProductOptions(tx, product.id, options, variations);
      if (stock !== null) {
        await tx.product.update({ where: { id: product.id }, data: { stock } });
      }
    }

    return tx.product.findUniqueOrThrow({
      where: { id: product.id },
      include: FULL_PRODUCT_INCLUDE,
    });
  }, TX_OPTIONS);
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

  const { images, specifications, options, variations, ...fields } =
    data;

  if (options && variations) assertValidOptions(options, variations);

  // A product with options keeps its stock as the total of its combinations.
  if (!options && fields.stock !== undefined) {
    const hasOptions = await prisma.productVariation.count({ where: { productId, isArchived: false } });
    if (hasOptions > 0) delete fields.stock;
  }

  // Read and compare outside the transaction - it only holds the writes.
  const before = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: FULL_PRODUCT_INCLUDE,
  });

  await prisma.$transaction(async (tx) => {
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

    await tx.product.update({
      where: { id: productId },
      data: {
        ...fields,
        slug,
        images: images ? { create: images } : undefined,
        specifications: specifications
          ? { create: specifications }
          : undefined,
      },
    });

    // Options are only touched when sent, so editing other details of a
    // product never changes its options. With options, stock is the total
    // of the active combinations.
    if (options && variations) {
      const stock = await saveProductOptions(tx, productId, options, variations);
      if (stock !== null) {
        await tx.product.update({ where: { id: productId }, data: { stock } });
      }
    }

  }, TX_OPTIONS);

  const after = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: FULL_PRODUCT_INCLUDE,
  });

  // Log what changed for admins. Turning the listing into a different
  // product also marks its existing reviews as for an earlier version.
  // The edit is already saved, so a failure here mustn't fail the request.
  const changes = diffProducts(before, after);
  if (changes.length === 0) return after;

  const reviewsReset = isDifferentProduct(before, after);
  try {
    await recordProductRevision(prisma, { productId, editedById: userId, changes, reviewsReset });
    if (reviewsReset) {
      return await prisma.product.update({
        where: { id: productId },
        data: { reviewsResetAt: new Date() },
        include: FULL_PRODUCT_INCLUDE,
      });
    }
  } catch (error) {
    console.error(`Recording edit history for product ${productId} failed:`, error);
  }

  return after;
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

  return prisma.$transaction(async (tx) => {
    await recordStatusChanges(tx, userId, [product], ProductStatus.ARCHIVED);
    return tx.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED },
    });
  }, TX_OPTIONS);
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
  state?: string;
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
    state,
    sort,
  } = filters;

  const skip = (page - 1) * limit;

  const where: any = {
    status: ProductStatus.PUBLISHED,
    store: { isSuspended: false },
  };

  if (state) {
    const canonical = findState(state)?.name ?? state;
    where.store.OR = stateSpellings(canonical).map((spelling) => ({
      state: { equals: spelling, mode: "insensitive" },
    }));
  }

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
  id: string,
  viewerId?: string
) => {
  const product = await prisma.product.findFirst({
    where: {
      id,
      status: ProductStatus.PUBLISHED,
    },
    include: {
      ...FULL_PRODUCT_INCLUDE,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true,
          isSuspended: true,
        },
      },
    },
  });

  // Products of a suspended store are hidden from everyone but admins.
  if (!product || (product.store.isSuspended && !(await isAdminUser(viewerId)))) {
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
      store: { isSuspended: false },
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

  const storeFilter: any = { isSuspended: false };
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
      store: { isSuspended: false },
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

export const bulkUpdateProductStatusService = async (
  userId: string,
  productIds: string[],
  status: ProductStatus
) => {
  const store = await getSellerStore(userId);

  const result = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, storeId: store.id },
      select: { id: true, status: true },
    });
    await recordStatusChanges(tx, userId, products, status);
    return tx.product.updateMany({
      where: { id: { in: productIds }, storeId: store.id },
      data: { status },
    });
  }, TX_OPTIONS);

  return { updatedCount: result.count };
};

export const bulkDeleteProductsService = async (
  userId: string,
  productIds: string[]
) => {
  const store = await getSellerStore(userId);

  const result = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, storeId: store.id },
      select: { id: true, status: true },
    });
    await recordStatusChanges(tx, userId, products, ProductStatus.ARCHIVED);
    return tx.product.updateMany({
      where: { id: { in: productIds }, storeId: store.id },
      data: { status: ProductStatus.ARCHIVED },
    });
  }, TX_OPTIONS);

  return { archivedCount: result.count };
};

const escapeCsvField = (value: unknown) => {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportSellerProductsCsvService = async (
  userId: string
) => {
  const store = await getSellerStore(userId);

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: {
      category: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "id",
    "title",
    "sku",
    "category",
    "price",
    "originalPrice",
    "stock",
    "status",
    "condition",
    "brand",
    "createdAt",
  ];

  const rows = products.map((product) =>
    [
      product.id,
      product.title,
      product.sku,
      product.category.name,
      product.price,
      product.originalPrice ?? "",
      product.stock,
      product.status,
      product.condition,
      product.brand ?? "",
      product.createdAt.toISOString(),
    ]
      .map(escapeCsvField)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
};

export const getSellerProductByIdService = async (
  userId: string,
  productId: string
) => {
  const store = await getSellerStore(userId);

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    // legacyVariants: old free-form rows the edit form offers to turn into options.
    include: { ...FULL_PRODUCT_INCLUDE, legacyVariants: true },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  return product;
};
