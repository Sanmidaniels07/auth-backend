/**
 * @swagger
 * tags:
 *   name: Recommendation
 *   description: Trending, best sellers, "For you" and recently viewed products
 */

/**
 * @swagger
 * /api/recommendations/trending:
 *   get:
 *     summary: Products buyers are most interested in right now
 *     description: Public. Ranked by activity in the last 14 days (paid orders count most, then saves, cart adds and views); looks back 90 days when fewer than 4 products have activity. Only live products (published, store not suspended). Cached for 10 minutes.
 *     tags:
 *       - Recommendation
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 8
 *           maximum: 24
 *     responses:
 *       200:
 *         description: Trending products fetched successfully
 */

/**
 * @swagger
 * /api/recommendations/best-sellers:
 *   get:
 *     summary: Products with the most units sold
 *     description: Public. Units sold on paid orders in the last 90 days (all time when fewer than 4 products have sold), cancelled items left out. Each product has `soldCount`. Cached for 10 minutes.
 *     tags:
 *       - Recommendation
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 8
 *           maximum: 24
 *       - in: query
 *         name: category
 *         description: Category slug - only best sellers in that category.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Best sellers fetched successfully
 */

/**
 * @swagger
 * /api/recommendations/for-you:
 *   get:
 *     summary: Products picked for the signed-in buyer
 *     description: Requires authentication. Based on the buyer's views (last 60 days), saved items, cart, past orders and followed stores, mixed with popular products, then new arrivals when there's little to go on. Leaves out the buyer's own store, products they've already bought and what's in their cart. Each product has `reason` - FOLLOWED_STORE, SIMILAR, POPULAR or NEW.
 *     tags:
 *       - Recommendation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *           maximum: 24
 *     responses:
 *       200:
 *         description: Recommendations fetched successfully
 */

/**
 * @swagger
 * /api/recommendations/recently-viewed:
 *   get:
 *     summary: Products the signed-in user opened lately
 *     description: Requires authentication. Newest first; includes sold-out products.
 *     tags:
 *       - Recommendation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *           maximum: 24
 *     responses:
 *       200:
 *         description: Recently viewed products fetched successfully
 */

/**
 * @swagger
 * /api/recommendations/views:
 *   post:
 *     summary: Record that the signed-in user opened a product
 *     description: Requires authentication. Called by the product page. Feeds trending, "For you" and recently viewed. Views of your own products aren't recorded. Views older than 90 days are dropped.
 *     tags:
 *       - Recommendation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: string
 *     responses:
 *       200:
 *         description: View recorded
 *       404:
 *         description: Product not found
 */
