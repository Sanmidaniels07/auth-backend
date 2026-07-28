/**
 * @swagger
 * tags:
 *   name: Checkout
 *   description: Converts the cart into an order and processes payment via Paystack
 */

/**
 * @swagger
 * /api/checkout/initiate:
 *   post:
 *     summary: Initiate checkout
 *     description: |
 *       Requires authentication. Validates the cart and the given address, creates a PENDING order (snapshotting current cart prices), and starts a Paystack transaction. Stock is NOT decremented and the cart is NOT cleared here - that only happens once payment is confirmed via verify or webhook.
 *
 *       Since a cart can span multiple stores and each store may have its own shipping tiers, `shippingSelections` must include one entry per store in the cart that has shipping options configured (stores with none configured contribute 0 delivery fee automatically). If `couponCode` is provided it's re-validated and applied server-side - the discount is never trusted from the client.
 *     tags:
 *       - Checkout
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addressId
 *             properties:
 *               addressId:
 *                 type: string
 *               shippingSelections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     storeId:
 *                       type: string
 *                     shippingOptionId:
 *                       type: string
 *               couponCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Checkout initiated successfully, returns the order plus a Paystack accessCode (for the inline popup) and authorizationUrl (for a redirect-based fallback)
 *       400:
 *         description: Cart is empty, a product is unavailable/out of stock, a required shipping selection is missing/invalid, or the coupon is invalid
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Address not found
 */

/**
 * @swagger
 * /api/checkout/verify/{reference}:
 *   get:
 *     summary: Verify a Paystack payment
 *     description: Requires authentication and ownership of the order tied to this reference. Call after the user returns from the Paystack checkout page. Verifies the transaction with Paystack, and on success marks the order PAID, decrements stock, and clears the cart. Safe to call multiple times (idempotent).
 *     tags:
 *       - Checkout
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment verified successfully (or already-processed order state, if called again)
 *       400:
 *         description: Payment was not successful, or amount mismatch
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/checkout/webhook/paystack:
 *   post:
 *     summary: Paystack webhook
 *     description: Called directly by Paystack, not by the frontend. Authenticated via the `x-paystack-signature` header (HMAC SHA512), not a bearer token. On a `charge.success` event, confirms payment the same way as the verify endpoint. Always responds 200 once the signature is valid, to avoid webhook retry storms.
 *     tags:
 *       - Checkout
 *     security: []
 *     responses:
 *       200:
 *         description: Event received and processed (or already handled)
 *       401:
 *         description: Invalid or missing webhook signature
 */

export {};
