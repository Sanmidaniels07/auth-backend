/**
 * @swagger
 * tags:
 *   name: Payment Methods
 *   description: Saved cards for repeat checkout, backed by Paystack authorization codes. Cards are saved automatically after a successful payment that returns a reusable Paystack authorization.
 */

/**
 * @swagger
 * /api/payment-methods:
 *   get:
 *     summary: List saved cards for the authenticated user
 *     description: Requires authentication.
 *     tags:
 *       - Payment Methods
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved cards fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/payment-methods/{id}/default:
 *   patch:
 *     summary: Set a saved card as the default
 *     description: Requires authentication. The card must belong to the requesting user.
 *     tags:
 *       - Payment Methods
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
 *         description: Default card updated successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Saved card not found
 */

/**
 * @swagger
 * /api/payment-methods/{id}:
 *   delete:
 *     summary: Remove a saved card
 *     description: Requires authentication. The card must belong to the requesting user.
 *     tags:
 *       - Payment Methods
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
 *         description: Saved card removed successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Saved card not found
 */

export {};
