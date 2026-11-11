/**
 * @swagger
 * tags:
 *   name: Return
 *   description: >
 *     Problem reports (returns). The buyer reports within the return window; the seller answers within 48h (24h for
 *     perishables) - REFUND, REPLACE or DISAGREE. No answer in time, a disagreement or a problem with the replacement
 *     makes it DISPUTED and Nestly decides (refund or reject). The buyer can keep the item while it's REQUESTED or
 *     DISPUTED. While a report is open the seller's payout for that order is held. Refunds are the item's full price
 *     (its share of any coupon off), plus the delivery fee when nothing from that seller was kept - sent through
 *     Paystack when Nestly holds the money, otherwise refundStatus FAILED and admins refund by hand.
 *     Statuses - REQUESTED, APPROVED (older requests), REPLACEMENT, REPLACED, DISPUTED, WITHDRAWN, REFUNDED, REJECTED.
 */

/**
 * @swagger
 * /api/returns:
 *   post:
 *     summary: Submit a return request
 *     description: >
 *       Requires authentication. Only for order items with status DELIVERED, one open report per item (and never after a refund). The seller gets
 *       sellerRespondBy - 48 hours, or 24 for perishables. Nestly's returns policy - no change-of-mind returns; reasonType must be DAMAGED, SPOILED, WRONG_ITEM,
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
 * /api/returns/{id}/respond:
 *   post:
 *     summary: Seller answers a problem report
 *     description: >
 *       Requires authentication; the item must be in the seller's store and the report REQUESTED (or an older APPROVED one).
 *       REFUND refunds the buyer straight away. REPLACE means a replacement is on its way (the buyer confirms it, or it
 *       closes itself after 7 days). DISAGREE needs a note of at least 10 characters and hands the decision to Nestly.
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
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [REFUND, REPLACE, DISAGREE]
 *               note:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Answer sent
 *       400:
 *         description: Invalid input (e.g. DISAGREE without a reason)
 *       404:
 *         description: Not found or not this seller's item
 *       409:
 *         description: Already answered
 */

/**
 * @swagger
 * /api/returns/{id}/buyer-action:
 *   post:
 *     summary: Buyer keeps the item, confirms the replacement, or reports a problem with it
 *     description: >
 *       Requires authentication; the report must be the buyer's. KEEP works while REQUESTED or DISPUTED and releases the
 *       seller's payout. REPLACEMENT_RECEIVED and REPLACEMENT_PROBLEM (note required) work while REPLACEMENT; a problem
 *       makes it DISPUTED for Nestly to decide.
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
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [KEEP, REPLACEMENT_RECEIVED, REPLACEMENT_PROBLEM]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report updated
 *       404:
 *         description: Not found
 *       409:
 *         description: Can't be changed in its current state
 */

/**
 * @swagger
 * /api/returns/admin:
 *   get:
 *     summary: Reports for Nestly to handle (admin)
 *     description: Admin only. Without status - every open report (disputed first) plus refunds that must be sent by hand (refundStatus FAILED). Includes the buyer's email and the payment reference.
 *     tags:
 *       - Return
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Return requests fetched successfully
 *       403:
 *         description: Admin role required
 */

/**
 * @swagger
 * /api/returns/{id}/decide:
 *   post:
 *     summary: Nestly decides a report (admin)
 *     description: Admin only. Works on any open report. REFUND refunds the buyer; REJECT closes it in the seller's favour. The note is shown to both.
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
 *             required: [decision]
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [REFUND, REJECT]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Decision saved
 *       409:
 *         description: Already closed
 */

export {};
