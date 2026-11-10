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
 *     description: >
 *       Requires authentication. Only for order items with status DELIVERED, one active request (REQUESTED or APPROVED)
 *       per item. Nestly's returns policy - no change-of-mind returns; reasonType must be DAMAGED, SPOILED, WRONG_ITEM,
 *       NOT_AS_DESCRIBED, FAULTY or NOT_RECEIVED. Must be reported within 3 days of delivery being confirmed, or 24 hours
 *       for perishable categories (Category.isPerishable) - deliveries confirmed before 10 Nov 2026 keep 7 days.
 *       Unconfirmed deliveries can always be reported. Perishables need at least one photo (they aren't sent back),
 *       except NOT_RECEIVED.
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
 *               - reasonType
 *               - reason
 *             properties:
 *               orderItemId:
 *                 type: string
 *               reasonType:
 *                 type: string
 *                 enum: [DAMAGED, SPOILED, WRONG_ITEM, NOT_AS_DESCRIBED, FAULTY, NOT_RECEIVED]
 *               reason:
 *                 type: string
 *                 description: What happened (3-1000 characters)
 *               photos:
 *                 type: array
 *                 maxItems: 5
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: Uploaded image URLs (https). Required (at least one) for perishables.
 *           example:
 *             orderItemId: cmw...
 *             reasonType: SPOILED
 *             reason: The cake arrived squashed and smelled off.
 *             photos: ["https://res.cloudinary.com/.../cake.jpg"]
 *     responses:
 *       201:
 *         description: Return request submitted successfully
 *       400:
 *         description: Item not delivered yet, a request already in progress, reporting window closed, or a perishable without a photo
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
