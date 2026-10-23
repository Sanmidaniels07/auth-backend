import { Router } from "express";

import { getSitemapEntries } from "./seo.controller";

const router = Router();

// Public - the website's sitemap.xml is built from this.
router.get("/sitemap", getSitemapEntries);

export default router;
