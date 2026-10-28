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

/**
 * @swagger
 * /api/seo/catalogue:
 *   get:
 *     summary: Categories with live products, and where they're sold
 *     description: Public. Every category with `productCount` (live products), `updatedAt` (latest product change, null if none) and `states` - [{ name, productCount, updatedAt }] using standard state names, most products first. Builds the public category pages (e.g. Cakes & Pastries in Lagos) and their sitemap entries. Cached for 15 minutes.
 *     tags:
 *       - SEO
 *     responses:
 *       200:
 *         description: Catalogue fetched successfully
 */

/**
 * @swagger
 * /api/seo/areas:
 *   get:
 *     summary: Areas with sellers, by state
 *     description: Public. Neighbourhoods and LGAs (known names only, e.g. Lekki, Ikeja) with live stores based in them or listing them in a delivery zone, grouped by state - `{ states: [{ name, areas: [{ name, storeCount, productCount, updatedAt, categories: [{ slug, productCount }] }] }] }`, most products first. Flat-rate zones with no areas don't count. Builds the public area pages (e.g. Cakes & Pastries in Lekki, Lagos) and their sitemap entries. Cached for 15 minutes.
 *     tags:
 *       - SEO
 *     responses:
 *       200:
 *         description: Areas fetched successfully
 */

/**
 * @swagger
 * /api/seo/areas/sellers:
 *   get:
 *     summary: Sellers serving an area
 *     description: Public. Up to 24 live stores based in or delivering to the area (with live products in the category, if given) - name, slug, logo, rating, totalSales, isVerified, city, state, productCount, reviewCount, basedHere. Stores based in the area first, then the best rated. No contact or payout details. Cached for 15 minutes.
 *     tags:
 *       - SEO
 *     parameters:
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *           example: Lagos
 *       - in: query
 *         name: area
 *         required: true
 *         schema:
 *           type: string
 *           example: Lekki
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           example: cakes-pastries
 *     responses:
 *       200:
 *         description: Area sellers fetched successfully
 *       400:
 *         description: state or area missing
 *       404:
 *         description: Unknown state or area
 */

/**
 * @swagger
 * /api/seo/merchant-feed:
 *   get:
 *     summary: Products for the Google Merchant Center feed
 *     description: Public. Live products (published or sold out, store not suspended) with at least one image - id, title, description, price (the cheapest active option for products with options), originalPrice (compare-at, when on sale), inStock, condition, brand, images (up to 10), category, storeName, updatedAt. The website serves this as /feeds/google-merchant.xml for Google Shopping free listings.
 *     tags:
 *       - SEO
 *     responses:
 *       200:
 *         description: Merchant feed fetched successfully
 */

export {};
