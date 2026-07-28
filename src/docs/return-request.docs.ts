/**
 * @swagger
 * tags:
 *   name: Return
 *   description: Return/refund requests. Tracked workflow only - no automatic Paystack refund is issued; the seller processes the actual refund manually and marks the request REFUNDED here.
 */

/**
 * @swagger
 * /api/returns:
 *   post:
 *     summary: Submit a return request
 *     description: Requires authentication. Only allowed for order items with status DELIVERED, and only one active request (REQUESTED or APPROVED) per item at a time.
 *     tags:
 *       - Return
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderItemId
 *               - reason
 *             properties:
 *               orderItemId:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Return request submitted successfully
 *       400:
 *         description: Item not delivered yet, or a request is already in progress
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Order item not found
 *   get:
 *     summary: Get the authenticated customer's return requests
 *     description: Requires authentication. Paginated, optionally filtered by status.
 *     tags:
 *       - Return
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
 *           enum: [REQUESTED, APPROVED, REJECTED, REFUNDED]
 *     responses:
 *       200:
 *         description: Return requests fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/returns/seller:
 *   get:
 *     summary: Get return requests for the authenticated seller's products
 *     description: Requires authentication and an existing store. Paginated, optionally filtered by status.
 *     tags:
 *       - Return
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
 *           enum: [REQUESTED, APPROVED, REJECTED, REFUNDED]
 *     responses:
 *       200:
 *         description: Return requests fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

/**
 * @swagger
 * /api/returns/{id}/status:
 *   patch:
 *     summary: Update a return request's status
 *     description: Requires authentication and ownership (the item must belong to the seller's store). Allowed transitions REQUESTED->APPROVED/REJECTED, APPROVED->REFUNDED only. REFUNDED does not trigger an actual Paystack refund - process that manually first, then mark it here.
 *     tags:
 *       - Return
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, REFUNDED]
 *     responses:
 *       200:
 *         description: Return request status updated successfully
 *       400:
 *         description: Invalid status transition
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not authorized to manage this return request
 *       404:
 *         description: Return request not found
 */

export {};
