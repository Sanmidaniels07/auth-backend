/**
 * @swagger
 * tags:
 *   name: StockAlert
 *   description: "Notify me when it's back" for sold-out products
 */

/**
 * @swagger
 * /api/stock-alerts:
 *   post:
 *     summary: Ask to be told when a product (or one of its options) is back in stock
 *     description: Requires authentication. Works on published and sold-out products of stores that aren't suspended. Asking twice is harmless. When it's available again the user gets a "Back in stock" notification and email (Shopping updates - NotificationType SHOPPING, which they can turn off) and the alert is removed.
 *     tags:
 *       - StockAlert
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
 *               variationId:
 *                 type: string
 *                 description: The sold-out option combination, for products with options.
 *     responses:
 *       201:
 *         description: We'll let you know when it's back in stock
 *       404:
 *         description: Product or option not found
 *   delete:
 *     summary: Stop waiting for a product (or option)
 *     tags:
 *       - StockAlert
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
 *               variationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Back-in-stock alert removed
 */

/**
 * @swagger
 * /api/stock-alerts/{productId}:
 *   get:
 *     summary: What the user is waiting for on this product
 *     description: Requires authentication. `variationIds` lists the options they're waiting for; null in the list means the whole product.
 *     tags:
 *       - StockAlert
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
 *         description: Back-in-stock alerts fetched successfully
 */

export {};
