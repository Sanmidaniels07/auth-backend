/**
 * @swagger
 * tags:
 *   name: Review
 *   description: Product reviews and seller ratings
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a review
 *     description: Requires authentication. Only allowed for products the user has actually purchased and received (a DELIVERED order item for that product must exist). One review per user per product. Creating a review recomputes the product's store rating.
 *     tags:
 *       - Review
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - rating
 *             properties:
 *               productId:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Already reviewed this product
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Product not purchased/delivered yet
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /api/reviews/{id}:
 *   patch:
 *     summary: Update a review
 *     description: Requires authentication and ownership. Recomputes the store's rating.
 *     tags:
 *       - Review
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not the author of this review
 *       404:
 *         description: Review not found
 *   delete:
 *     summary: Delete a review
 *     description: Requires authentication and ownership. Recomputes the store's rating.
 *     tags:
 *       - Review
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not the author of this review
 *       404:
 *         description: Review not found
 */

/**
 * @swagger
 * /api/products/{id}/reviews:
 *   get:
 *     summary: Get reviews for a product
 *     description: Public endpoint. Paginated, includes the average rating for this product.
 *     tags:
 *       - Review
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Product reviews fetched successfully
 */

/**
 * @swagger
 * /api/stores/{slug}/reviews:
 *   get:
 *     summary: Get reviews for a store (seller ratings)
 *     description: Public endpoint. Paginated, across all of the store's products, includes the store's overall rating (Store.rating, kept in sync whenever a review is created/updated/deleted).
 *     tags:
 *       - Review
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
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
 *         description: Store reviews fetched successfully
 *       404:
 *         description: Store not found
 */

export {};
