import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
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

  return prisma.category.update({
    where: { id: categoryId },
    data: { ...data, slug },
  });
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
  return prisma.category.findMany({
    where: { isFeatured: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
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
