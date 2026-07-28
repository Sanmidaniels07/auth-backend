/**
 * @swagger
 * tags:
 *   name: Order
 *   description: Customer and seller order management. All endpoints require authentication.
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get the authenticated customer's orders
 *     description: Paginated, optionally filtered by order status.
 *     tags:
 *       - Order
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED]
 *     responses:
 *       200:
 *         description: Orders fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get one of the authenticated customer's orders
 *     description: Returns full order detail plus a derived `timeline` (based on current status, createdAt/updatedAt - there's no per-transition history table, so only the created and current steps have real timestamps).
 *     tags:
 *       - Order
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
 *         description: Order fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   patch:
 *     summary: Cancel an order
 *     description: Only allowed while none of the order's items have started fulfillment (all still PENDING). If the order had already been paid for, cancelled items' stock is restored. Delivered or already-cancelled orders cannot be cancelled again.
 *     tags:
 *       - Order
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
 *         description: Order cancelled successfully
 *       400:
 *         description: Order already cancelled/delivered, or fulfillment already started
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/orders/seller:
 *   get:
 *     summary: Get orders containing the authenticated seller's products
 *     description: Requires an existing store. Only shows paid+ orders (unpaid PENDING orders are excluded), and only the seller's own items within each order - not other sellers' items in the same order. The `status` filter matches the seller's own OrderItem status, not the overall order status.
 *     tags:
 *       - Order
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED]
 *     responses:
 *       200:
 *         description: Seller orders fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

/**
 * @swagger
 * /api/orders/seller/{id}:
 *   get:
 *     summary: Get one order containing the authenticated seller's products
 *     description: Requires an existing store. Returns only the seller's own items within the order.
 *     tags:
 *       - Order
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
 *         description: Order fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 *       404:
 *         description: Order not found, or contains none of this seller's products
 */

/**
 * @swagger
 * /api/orders/seller/items/{orderItemId}/status:
 *   patch:
 *     summary: Update the fulfillment status of one of the seller's order items
 *     description: |
 *       Since a single order can contain items from multiple sellers, sellers can only update the status of their OWN order items, not the order as a whole. The overall order status is automatically recomputed as the least-progressed status among its active (non-cancelled) items - e.g. the order only becomes SHIPPED once every seller's items have shipped.
 *
 *       Status can only move forward (PENDING -> PROCESSING -> SHIPPED -> DELIVERED); moving backward is rejected. The order must already be paid for.
 *     tags:
 *       - Order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderItemId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED]
 *     responses:
 *       200:
 *         description: Order item status updated successfully, returns the updated order with its recomputed overall status
 *       400:
 *         description: Order not yet paid, item already cancelled, or status moved backward
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not authorized to update this item
 *       404:
 *         description: Order item not found
 */

export {};
