/**
 * @swagger
 * tags:
 *   name: Wishlist
 *   description: Save and manage a user's saved products
 */

/**
 * @swagger
 * /api/wishlist:
 *   post:
 *     summary: Add a product to the wishlist
 *     description: Requires authentication. Fails if the product doesn't exist or is already in the wishlist.
 *     tags:
 *       - Wishlist
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
 *             properties:
 *               productId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product added to wishlist
 *       400:
 *         description: Product already in wishlist
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Product not found
 *   get:
 *     summary: Get the authenticated user's wishlist
 *     description: Requires authentication. Returns saved products with basic product/store details, paginated.
 *     tags:
 *       - Wishlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Wishlist fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/wishlist/{productId}:
 *   delete:
 *     summary: Remove a product from the wishlist
 *     description: Requires authentication.
 *     tags:
 *       - Wishlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product removed from wishlist
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Product not found in wishlist
 */

export {};
