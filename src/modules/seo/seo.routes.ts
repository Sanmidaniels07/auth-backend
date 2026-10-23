import { Router } from "express";

import { getCatalogue, getSitemapEntries } from "./seo.controller";

const router = Router();

// Public - the website's sitemap.xml is built from this.
router.get("/sitemap", getSitemapEntries);

// Public - categories with live products and the states they're sold in.
router.get("/catalogue", getCatalogue);

export default router;
