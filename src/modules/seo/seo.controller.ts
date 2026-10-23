import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { getSitemapEntriesService } from "./seo.service";

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
