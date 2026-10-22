import { NotificationType, ProductStatus } from "@prisma/client";
import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { createNotificationService } from "../notification/notification.service";
import { sendEmail } from "../auth/email.services";
import { commissionChangeTemplate } from "../../templates/commission-change.template";
import { generateUniqueSlug } from "../../utils/slugify";
import {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.validation";

export const createCategoryService = async (
  data: CreateCategoryInput
) => {
  const slug = await generateUniqueSlug(
    data.name,
    async (candidate) => {
      const found = await prisma.category.findUnique({
        where: { slug: candidate },
      });
      return !!found;
    }
  );

  return prisma.category.create({
    data: { ...data, slug },
  });
};

export const getCategoriesService = async () => {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
};

export const getCategoryBySlugService = async (
  slug: string
) => {
  const category = await prisma.category.findUnique({
    where: { slug },
  });

  if (!category) {
    throw new AppError("Category not found.", 404);
  }

  return category;
};

export const updateCategoryService = async (
  categoryId: string,
  data: UpdateCategoryInput
) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError("Category not found.", 404);
  }

  let slug = category.slug;

  if (data.name && data.name !== category.name) {
    slug = await generateUniqueSlug(
      data.name,
      async (candidate) => {
        const found = await prisma.category.findFirst({
          where: {
            slug: candidate,
            NOT: { id: categoryId },
          },
        });
        return !!found;
      }
    );
  }

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: { ...data, slug },
  });

  // Sellers must hear about fee changes - fire-and-forget so the admin's
  // save isn't held up by emails.
  if (data.commissionRate !== undefined && data.commissionRate !== category.commissionRate) {
    notifySellersOfCommissionChange(updated.id, updated.name, category.commissionRate, data.commissionRate).catch(
      (error) => console.error("Commission change notifications failed:", error)
    );
  }

  return updated;
};

/**
 * Tells every seller with a (non-archived) product in the category that its
 * commission changed - in-app and by email. Rates are snapshotted onto each
 * order item at checkout, so this only affects orders placed from now on.
 */
export const notifySellersOfCommissionChange = async (
  categoryId: string,
  categoryName: string,
  oldRate: number,
  newRate: number
) => {
  const stores = await prisma.store.findMany({
    where: {
      isSuspended: false,
      products: { some: { categoryId, status: { not: ProductStatus.ARCHIVED } } },
    },
    select: {
      name: true,
      seller: { select: { user: { select: { id: true, name: true, email: true, deletedAt: true } } } },
    },
  });

  const productsUrl = `${process.env.FRONTEND_URL ?? ""}/settings/marketplace?tab=products`;
  let notified = 0;

  for (const store of stores) {
    const user = store.seller.user;
    if (user.deletedAt) continue;

    await createNotificationService(
      user.id,
      `${categoryName} commission is now ${newRate}%`,
      `Nestly commission for ${categoryName} changed from ${oldRate}% to ${newRate}%. It applies to new orders; past orders keep their rate.`,
      NotificationType.SYSTEM,
      { type: "COMMISSION_CHANGE", id: categoryId }
    );

    sendEmail(
      user.email,
      `${categoryName} commission is now ${newRate}%`,
      commissionChangeTemplate(user.name.split(" ")[0] || user.name, store.name, categoryName, oldRate, newRate, productsUrl)
    ).catch((error) => console.error(`Commission change email to ${user.email} failed:`, error));

    notified++;
  }

  return notified;
};

export const deleteCategoryService = async (
  categoryId: string
) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError("Category not found.", 404);
  }

  const productCount = await prisma.product.count({
    where: { categoryId },
  });

  if (productCount > 0) {
    throw new AppError(
      "Cannot delete a category that still has products.",
      400
    );
  }

  await prisma.category.delete({
    where: { id: categoryId },
  });
};

export const getFeaturedCategoriesService = async (
  limit: number
) => {
  const categories = await prisma.category.findMany({
    where: { isFeatured: true },
    take: limit,
    // Categories buyers can actually shop first, so the marketplace never
    // leads with empty ones when many are featured.
    orderBy: [{ products: { _count: "desc" } }, { name: "asc" }],
    include: {
      _count: {
        select: { products: { where: { status: ProductStatus.PUBLISHED } } },
      },
    },
  });

  // Live (published) product count, so the marketplace can show it per card.
  return categories.map(({ _count, ...category }) => ({
    ...category,
    productCount: _count.products,
  }));
};

export const getPopularCategoriesService = async (
  limit: number
) => {
  return prisma.category.findMany({
    take: limit,
    orderBy: {
      products: { _count: "desc" },
    },
    include: {
      _count: { select: { products: true } },
    },
  });
};
