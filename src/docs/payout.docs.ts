/**
 * @swagger
 * tags:
 *   name: Admin Payouts
 *   description: Admin-managed payout ledger for seller stores. Payouts are tracked and paid out manually outside the platform.
 */

/**
 * @swagger
 * /api/admin/payouts:
 *   post:
 *     summary: Record a payout to a store
 *     description: Requires authentication and ADMIN role. Amount must not exceed the store's current available balance.
 *     tags:
 *       - Admin Payouts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeId
 *               - amount
 *             properties:
 *               storeId:
 *                 type: string
 *               amount:
 *                 type: number
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payout recorded successfully
 *       400:
 *         description: Amount exceeds available balance
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: Store not found
 *   get:
 *     summary: List recorded payouts
 *     description: Requires authentication and ADMIN role. Optionally filtered by store.
 *     tags:
 *       - Admin Payouts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
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
 *         description: Payouts fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 */

export {};
