import { Prisma, ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { generateUniqueSlug } from "../../utils/slugify";
import { getSellerStore } from "../seller/seller.utils";
import { CreateCollectionInput, UpdateCollectionInput } from "./collection.validation";

// Products a buyer can see in a collection: listed in the shop (sold-out
// ones stay, marked sold out). Drafts, removed and pay-link-only items don't.
const SHOWN: ProductStatus[] = [ProductStatus.PUBLISHED, ProductStatus.OUT_OF_STOCK];

const PRODUCT_SELECT = {
  id: true,
  title: true,
  description: true,
  brand: true,
  condition: true,
  highlights: true,
  specifications: { select: { name: true, value: true } },
  price: true,
  originalPrice: true,
  stock: true,
  status: true,
  images: { orderBy: [{ isPrimary: "desc" as const }, { id: "asc" as const }], select: { url: true, isPrimary: true } },
  options: { orderBy: { position: "asc" as const }, select: { name: true, values: true, position: true } },
  variations: {
    where: { isArchived: false },
    orderBy: { createdAt: "asc" as const },
    select: { id: true, option1: true, option2: true, price: true, stock: true, isActive: true },
  },
} satisfies Prisma.ProductSelect;

const ITEMS_INCLUDE = {
  items: { orderBy: { position: "asc" as const }, include: { product: { select: PRODUCT_SELECT } } },
} satisfies Prisma.CollectionInclude;

type CollectionWithItems = Prisma.CollectionGetPayload<{ include: typeof ITEMS_INCLUDE }>;

// For the seller: the collection and its products (all of them, with their
// status, so a draft or removed product can be spotted and swapped).
const forSeller = (collection: CollectionWithItems, storeSlug: string) => ({
  id: collection.id,
  name: collection.name,
  slug: collection.slug,
  description: collection.description,
  isActive: collection.isActive,
  path: `/${storeSlug}/${collection.slug}`,
  createdAt: collection.createdAt,
  updatedAt: collection.updatedAt,
  products: collection.items.map(({ product }) => ({
    id: product.id,
    title: product.title,
    price: product.price,
    status: product.status,
    image: product.images[0]?.url ?? null,
  })),
});

// The products must all be this store's own and listed in the shop.
const checkedProductIds = async (storeId: string, productIds: string[]) => {
  const ids = [...new Set(productIds)];
  const found = await prisma.product.findMany({
    where: { id: { in: ids }, storeId },
    select: { id: true, status: true, title: true },
  });
  if (found.length !== ids.length) throw new AppError("Some of those products aren't in your store.", 400);
  const hidden = found.find((product) => !SHOWN.includes(product.status));
  if (hidden) throw new AppError(`"${hidden.title}" isn't listed in your shop - publish it first, or leave it out.`, 400);
  return ids;
};

const getOwned = async (userId: string, id: string) => {
  const store = await getSellerStore(userId);
  const collection = await prisma.collection.findUnique({ where: { id }, include: ITEMS_INCLUDE });
  if (!collection || collection.storeId !== store.id) throw new AppError("Collection not found.", 404);
  return { store, collection };
};

export const listMyCollectionsService = async (userId: string) => {
  const store = await getSellerStore(userId);
  const collections = await prisma.collection.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    include: ITEMS_INCLUDE,
  });
  return collections.map((collection) => forSeller(collection, store.slug));
};

export const createCollectionService = async (userId: string, data: CreateCollectionInput) => {
  const store = await getSellerStore(userId);
  const productIds = await checkedProductIds(store.id, data.productIds);
  const slug = await generateUniqueSlug(data.name, async (candidate) =>
    !!(await prisma.collection.findUnique({ where: { storeId_slug: { storeId: store.id, slug: candidate } }, select: { id: true } }))
  );
  if (!slug) throw new AppError("Use some letters or numbers in the name.", 400);
  const collection = await prisma.collection.create({
    data: {
      storeId: store.id,
      name: data.name,
      slug,
      description: data.description ?? null,
      items: { create: productIds.map((productId, position) => ({ productId, position })) },
    },
    include: ITEMS_INCLUDE,
  });
  return forSeller(collection, store.slug);
};

export const updateCollectionService = async (userId: string, id: string, data: UpdateCollectionInput) => {
  const { store, collection } = await getOwned(userId, id);
  const productIds = data.productIds ? await checkedProductIds(store.id, data.productIds) : null;

  const updated = await prisma.$transaction(async (tx) => {
    if (productIds) {
      await tx.collectionItem.deleteMany({ where: { collectionId: collection.id } });
      await tx.collectionItem.createMany({
        data: productIds.map((productId, position) => ({ collectionId: collection.id, productId, position })),
      });
    }
    // The link (slug) stays the same when the name changes - it's been shared.
    return tx.collection.update({
      where: { id: collection.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: ITEMS_INCLUDE,
    });
  });
  return forSeller(updated, store.slug);
};

export const deleteCollectionService = async (userId: string, id: string) => {
  const { collection } = await getOwned(userId, id);
  await prisma.collection.delete({ where: { id: collection.id } });
};

const PUBLIC_STORE_SELECT = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  brandColor: true,
  isVerified: true,
  isSuspended: true,
  city: true,
  state: true,
  referralCode: true,
  _count: { select: { shippingOptions: { where: { isArchived: false } } } },
} satisfies Prisma.StoreSelect;

// The page buyers open: the store, the collection and its products (only
// the ones listed in the shop, in the seller's order). A store's name from
// before a rename still finds it.
export const getPublicCollectionService = async (storeSlug: string, slug: string) => {
  const store =
    (await prisma.store.findUnique({ where: { slug: storeSlug }, select: PUBLIC_STORE_SELECT })) ??
    (await prisma.store.findFirst({ where: { previousSlugs: { has: storeSlug } }, select: PUBLIC_STORE_SELECT }));
  if (!store || store.isSuspended) throw new AppError("Collection not found.", 404);

  const collection = await prisma.collection.findUnique({
    where: { storeId_slug: { storeId: store.id, slug } },
    include: ITEMS_INCLUDE,
  });
  if (!collection) throw new AppError("Collection not found.", 404);

  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    // Switched off by the seller: the page says so (instead of "not found").
    isActive: collection.isActive,
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      brandColor: store.brandColor,
      isVerified: store.isVerified,
      city: store.city,
      state: store.state,
      referralCode: store.referralCode,
      canDeliver: store._count.shippingOptions > 0,
    },
    products: collection.isActive
      ? collection.items
          .map(({ product }) => product)
          .filter((product) => SHOWN.includes(product.status))
          .map((product) => ({ ...product, soldOut: product.status === ProductStatus.OUT_OF_STOCK || product.stock <= 0 }))
      : [],
  };
};
