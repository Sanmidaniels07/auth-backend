/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get the authenticated user's cart
 *     description: Requires authentication. Returns cart items with product details, subtotal and item count. Returns an empty cart if the user has never added anything.
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *   post:
 *     summary: Add a product to the cart
 *     description: Requires authentication. Creates the user's cart on first use. If the product is already in the cart, increases its quantity instead of duplicating the entry. Fails if the requested quantity exceeds available stock.
 *     tags:
 *       - Cart
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
 *               quantity:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       201:
 *         description: Product added to cart
 *       400:
 *         description: Product unavailable or requested quantity exceeds stock
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /api/cart/{productId}:
 *   patch:
 *     summary: Update the quantity of a cart item
 *     description: Requires authentication. Fails if the requested quantity exceeds available stock.
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *       400:
 *         description: Requested quantity exceeds available stock
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Product not found in cart
 *   delete:
 *     summary: Remove a product from the cart
 *     description: Requires authentication.
 *     tags:
 *       - Cart
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
 *         description: Product removed from cart
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Product not found in cart
 */

export {};
