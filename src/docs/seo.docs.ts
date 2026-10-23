/**
 * @swagger
 * tags:
 *   name: SEO
 *   description: Data for search engines
 */

/**
 * @swagger
 * /api/seo/sitemap:
 *   get:
 *     summary: Pages to list in the website's sitemap
 *     description: Public. Live products (published, store not suspended) as `{ id, updatedAt }` and stores with at least one live product as `{ slug, updatedAt }`, most recently changed first. The website turns these into /marketplace/product/{id} and /marketplace/seller/{slug} URLs. Cached for 15 minutes.
 *     tags:
 *       - SEO
 *     responses:
 *       200:
 *         description: Sitemap entries fetched successfully
 */

export {};
