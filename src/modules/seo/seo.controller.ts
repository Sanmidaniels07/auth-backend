import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { getAreaSellersService, getAreasService, getCatalogueService, getMerchantFeedService, getSitemapEntriesService } from "./seo.service";

export const getSitemapEntries = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await getSitemapEntriesService();

    // The website rebuilds its sitemap hourly; let caches help too.
    res.set("Cache-Control", "public, max-age=900");
    res.status(200).json(
      apiResponse(result, "Sitemap entries fetched successfully")
    );
  }
);

export const getCatalogue = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await getCatalogueService();

    res.set("Cache-Control", "public, max-age=900");
    res.status(200).json(
      apiResponse(result, "Catalogue fetched successfully")
    );
  }
);

export const getMerchantFeed = asyncHandler(
  async (_req: Request, res: Response) => {
    const products = await getMerchantFeedService();

    res.set("Cache-Control", "public, max-age=900");
    res.status(200).json(
      apiResponse({ products }, "Merchant feed fetched successfully")
    );
  }
);

export const getAreas = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await getAreasService();

    res.set("Cache-Control", "public, max-age=900");
    res.status(200).json(
      apiResponse(result, "Areas fetched successfully")
    );
  }
);

export const getAreaSellers = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await getAreaSellersService({
      state: req.query.state as string,
      area: req.query.area as string,
      category: req.query.category as string | undefined,
    });

    res.set("Cache-Control", "public, max-age=900");
    res.status(200).json(
      apiResponse(result, "Area sellers fetched successfully")
    );
  }
);
