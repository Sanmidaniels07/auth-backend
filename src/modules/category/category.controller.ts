import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  IdParams,
  SlugParams,
} from "../../types/request.types";
import {
  createCategoryService,
  getCategoriesService,
  getCategoryBySlugService,
  updateCategoryService,
  deleteCategoryService,
  getFeaturedCategoriesService,
  getPopularCategoriesService,
} from "./category.service";

export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const category = await createCategoryService(
      req.body
    );

    res.status(201).json(
      apiResponse(
        category,
        "Category created successfully"
      )
    );
  }
);

export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await getCategoriesService();

    res.status(200).json(
      apiResponse(
        categories,
        "Categories fetched successfully"
      )
    );
  }
);

export const getFeaturedCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 8;

    const categories =
      await getFeaturedCategoriesService(limit);

    res.status(200).json(
      apiResponse(
        categories,
        "Featured categories fetched successfully"
      )
    );
  }
);

export const getPopularCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 8;

    const categories =
      await getPopularCategoriesService(limit);

    res.status(200).json(
      apiResponse(
        categories,
        "Popular categories fetched successfully"
      )
    );
  }
);

export const getCategoryBySlug = asyncHandler(
  async (req: Request<SlugParams>, res: Response) => {
    const category = await getCategoryBySlugService(
      req.params.slug
    );

    res.status(200).json(
      apiResponse(
        category,
        "Category fetched successfully"
      )
    );
  }
);

export const updateCategory = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const category = await updateCategoryService(
      req.params.id,
      req.body
    );

    res.status(200).json(
      apiResponse(
        category,
        "Category updated successfully"
      )
    );
  }
);

export const deleteCategory = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await deleteCategoryService(req.params.id);

    res.status(200).json(
      apiResponse(
        null,
        "Category deleted successfully"
      )
    );
  }
);
