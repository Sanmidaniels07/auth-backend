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

/**
 * @swagger
 * /api/seller/payouts:
 *   get:
 *     summary: The seller's payouts (hold-then-pay)
 *     description: >
 *       Requires authentication and a store. Orders not yet paid out with their state - AWAITING_DELIVERY,
 *       IN_RETURN_WINDOW (releaseAt is when it becomes payable), ON_HOLD (a problem report is open), READY (paid in the
 *       next run) or PROCESSING (transfer on its way) - totals per state, recent payouts (failed transfers are hidden;
 *       their orders are paid again), the bank account payouts go to, and earlierBalance from orders before
 *       hold-then-pay.
 *     tags:
 *       - Payout
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payouts fetched successfully
 */

/**
 * @swagger
 * /api/admin/payouts/held:
 *   get:
 *     summary: Money Nestly is holding, per seller (admin)
 *     description: Admin only. Totals per state for every seller with held orders, whether automatic transfers are on, and transfers that failed in the last 30 days (with Paystack's reason).
 *     tags:
 *       - Payout
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Held payouts fetched successfully
 */

/**
 * @swagger
 * /api/admin/payouts/held/{storeId}/pay:
 *   post:
 *     summary: Pay a seller's ready orders by hand (admin)
 *     description: Admin only. For when automatic transfers are off or keep failing. Records a MANUAL payout for every READY order of the store and closes them - send the money yourself first.
 *     tags:
 *       - Payout
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payout recorded
 *       400:
 *         description: Nothing ready to pay
 */

/**
 * @swagger
 * /api/admin/payouts/run:
 *   post:
 *     summary: Run payouts now (admin)
 *     description: Admin only. Same as the scheduled run (every 30 minutes) but ignores the one-transfer-a-day limit. Returns how many transfers were sent and why any seller was skipped.
 *     tags:
 *       - Payout
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payout run finished
 */

export {};
