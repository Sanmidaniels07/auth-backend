/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Global search across users, posts, communities, and hashtags
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Quick search across all categories
 *     description: Public endpoint (optional auth for block-aware filtering). Returns up to 5 results per category - users, posts, communities, hashtags.
 *     tags:
 *       - Search
 *     security: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quick search results fetched successfully
 *       400:
 *         description: Missing or empty query
 */

/**
 * @swagger
 * /api/search/{type}:
 *   get:
 *     summary: Full paginated search within a single category
 *     description: Public endpoint (optional auth for block-aware filtering).
 *     tags:
 *       - Search
 *     security: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [users, posts, communities, hashtags]
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results fetched successfully
 *       400:
 *         description: Invalid type or missing query
 */

export {};
