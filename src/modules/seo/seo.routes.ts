import { Router } from "express";

import { validate } from "../../middleware/validate.middleware";
import { areaSellersSchema } from "./seo.validation";
import { getAreaSellers, getAreas, getCatalogue, getMerchantFeed, getSitemapEntries } from "./seo.controller";

const router = Router();

// Public - the website's sitemap.xml is built from this.
router.get("/sitemap", getSitemapEntries);

// Public - categories with live products and the states they're sold in.
router.get("/catalogue", getCatalogue);

// Public - neighbourhoods / LGAs with sellers based in or delivering to them.
router.get("/areas", getAreas);

// Public - the sellers serving one area (optionally in one category).
router.get("/areas/sellers", validate(areaSellersSchema), getAreaSellers);

// Public - the website's Google Merchant Center product feed is built from this.
router.get("/merchant-feed", getMerchantFeed);

export default router;
