/**
 * @swagger
 * tags:
 *   name: Seller Dashboard
 *   description: Aggregated stats and analytics for the authenticated seller's store. All endpoints require authentication and an existing store.
 */

/**
 * @swagger
 * /api/seller/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Returns total products, total orders, total revenue (paid+ orders only), pending orders, total unique customers and the store's rating.
 *     tags:
 *       - Seller Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

/**
 * @swagger
 * /api/seller/dashboard/recent-orders:
 *   get:
 *     summary: Get recent orders
 *     description: Returns the most recent orders that contain at least one of the seller's products. Each order includes only the seller's own items and a `sellerSubtotal` (not the full multi-seller order total).
 *     tags:
 *       - Seller Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent orders fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

/**
 * @swagger
 * /api/seller/dashboard/inventory:
 *   get:
 *     summary: Get inventory snapshot
 *     description: Returns product counts by status plus a list of low-stock products (stock greater than 0 and at or below the threshold).
 *     tags:
 *       - Seller Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Inventory snapshot fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

/**
 * @swagger
 * /api/seller/dashboard/sales-overview:
 *   get:
 *     summary: Get sales overview
 *     description: Returns a daily revenue and order-count series for the last N days (paid+ orders only), one entry per day including days with zero sales.
 *     tags:
 *       - Seller Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Sales overview fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

/**
 * @swagger
 * /api/seller/dashboard/top-products:
 *   get:
 *     summary: Get top-selling products
 *     description: Returns the seller's best-selling products by units sold (paid+ orders only), with units sold and revenue for each.
 *     tags:
 *       - Seller Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Top products fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

/**
 * @swagger
 * /api/seller/dashboard/analytics:
 *   get:
 *     summary: Get order status and category revenue breakdown
 *     description: Returns a count of orders by status and revenue grouped by product category (paid+ orders only), for higher-level analytics beyond the daily sales overview.
 *     tags:
 *       - Seller Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

export {};
