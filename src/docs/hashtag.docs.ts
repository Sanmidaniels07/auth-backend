/**
 * @swagger
 * tags:
 *   name: Hashtag
 *   description: Hashtags extracted from post content
 */

/**
 * @swagger
 * /api/hashtags/trending:
 *   get:
 *     summary: Get trending hashtags
 *     description: Public endpoint. Ranks hashtags by number of posts using them within the given time window.
 *     tags:
 *       - Hashtag
 *     security: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: Trending hashtags fetched successfully
 */

/**
 * @swagger
 * /api/hashtags/{tag}/posts:
 *   get:
 *     summary: Get posts using a hashtag
 *     description: Public endpoint, paginated. `tag` is matched case-insensitively without the leading `#`.
 *     tags:
 *       - Hashtag
 *     security: []
 *     parameters:
 *       - in: path
 *         name: tag
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
 *         description: Posts fetched successfully
 */

export {};
