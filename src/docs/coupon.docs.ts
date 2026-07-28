/**
 * @swagger
 * tags:
 *   name: Coupon
 *   description: Discount coupons
 */

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate a coupon against the authenticated user's current cart
 *     description: Requires authentication. Checks the coupon exists, is active, hasn't expired, hasn't hit its usage limit, meets any minimum order amount against the cart subtotal, and hasn't already been used by this user. Does not redeem it - actual redemption happens on successful checkout payment.
 *     tags:
 *       - Coupon
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coupon is valid, returns discountAmount
 *       400:
 *         description: Invalid, expired, exhausted, already used, or cart doesn't meet the minimum order amount
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Create a coupon
 *     description: Requires authentication. ADMIN only.
 *     tags:
 *       - Coupon
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - type
 *               - value
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               value:
 *                 type: number
 *               minOrderAmount:
 *                 type: number
 *               usageLimit:
 *                 type: integer
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Coupon created successfully
 *       400:
 *         description: A coupon with this code already exists
 *       403:
 *         description: Admin only
 *   get:
 *     summary: List coupons
 *     description: Requires authentication. ADMIN only.
 *     tags:
 *       - Coupon
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
 *     responses:
 *       200:
 *         description: Coupons fetched successfully
 *       403:
 *         description: Admin only
 */

/**
 * @swagger
 * /api/coupons/{id}:
 *   patch:
 *     summary: Update a coupon
 *     description: Requires authentication. ADMIN only. Set `isActive` to false to deactivate a coupon.
 *     tags:
 *       - Coupon
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
 *             properties:
 *               value:
 *                 type: number
 *               minOrderAmount:
 *                 type: number
 *               usageLimit:
 *                 type: integer
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *       403:
 *         description: Admin only
 *       404:
 *         description: Coupon not found
 */

export {};
