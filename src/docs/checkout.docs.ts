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
 *       The unpaid order holds its quantities for 15 minutes: while other buyers' unpaid orders hold the remaining stock, this returns 409 ("someone is paying for the last one"). The buyer's own earlier unpaid attempts don't count. If a payment is confirmed after its hold ran out and the item sold out meanwhile, nothing is taken from stock - verify/webhook return the order as CANCELLED with `cancelReason`, and the payment is refunded through Paystack (`refundStatus` REQUESTED, or FAILED when admins must refund it by hand - they're notified). The same applies to payment links and saved-card checkout.
 *
 *       `source` (optional): where the visitor came from - one of GOOGLE, OTHER_SEARCH, WHATSAPP, INSTAGRAM, FACEBOOK, TIKTOK, X, SELLER_LINK, PAYMENT_LINK, OTHER_SITE, DIRECT (unknown values are ignored). Saved on the order for the admin overview only.
 *
 *       Since a cart can span multiple stores and each store may have its own shipping tiers, `shippingSelections` must include one entry per store in the cart that has shipping options configured (a store with no delivery zone and no pickup point can't be ordered from - 400; pickup alone is enough). Only zones whose `vehicle` can carry every product bought from that store (by each product's `deliveryVehicle`; truck > car > bike), zones with no vehicle and pickup can be chosen - otherwise 400. The chosen vehicle is saved on the order's shipping row. If `couponCode` is provided it's re-validated and applied server-side - the discount is never trusted from the client.
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
 *               deliveryPhone:
 *                 type: string
 *                 example: "0803 123 4567"
 *                 description: Optional. Number the seller calls to deliver; defaults to the address's phone. Sellers only see it for delivery (not pickup) orders - in the "New order" notification and email, and on the order until their items are delivered.
 *               sellerNotes:
 *                 type: array
 *                 description: Optional note per store (extras, sizes, gift message), max 500 characters each. Blank notes and stores not in the cart are ignored. Each seller only ever sees their own store's note, shown on their order and in the "New order" notification and email once payment succeeds. Phone numbers, emails, handles and social links in notes are hidden - the delivery number goes in deliveryPhone.
 *                 items:
 *                   type: object
 *                   required:
 *                     - storeId
 *                     - note
 *                   properties:
 *                     storeId:
 *                       type: string
 *                     note:
 *                       type: string
 *                       maxLength: 500
 *                       example: Please write "Happy birthday Tolu" on the cake.
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
 * /api/checkout/charge-saved-card:
 *   post:
 *     summary: Checkout using a previously saved card
 *     description: Requires authentication. Same cart/address/shipping/coupon validation as /api/checkout/initiate, but charges a saved Paystack authorization code directly instead of starting an inline popup - the order is finalized synchronously in the same request when the charge succeeds.
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
 *               - savedCardId
 *             properties:
 *               addressId:
 *                 type: string
 *               savedCardId:
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
 *               deliveryPhone:
 *                 type: string
 *                 example: "0803 123 4567"
 *                 description: Optional. Number the seller calls to deliver; defaults to the address's phone. Sellers only see it for delivery (not pickup) orders - in the "New order" notification and email, and on the order until their items are delivered.
 *               sellerNotes:
 *                 type: array
 *                 description: Optional note per store (extras, sizes, gift message), max 500 characters each. Blank notes and stores not in the cart are ignored. Each seller only ever sees their own store's note, shown on their order and in the "New order" notification and email once payment succeeds. Phone numbers, emails, handles and social links in notes are hidden - the delivery number goes in deliveryPhone.
 *                 items:
 *                   type: object
 *                   required:
 *                     - storeId
 *                     - note
 *                   properties:
 *                     storeId:
 *                       type: string
 *                     note:
 *                       type: string
 *                       maxLength: 500
 *                       example: Please write "Happy birthday Tolu" on the cake.
 *     responses:
 *       200:
 *         description: Payment charged and order finalized successfully
 *       400:
 *         description: Cart is empty, a product is unavailable/out of stock, a required shipping selection is missing/invalid, the coupon is invalid, or the card charge failed
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Address or saved card not found
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
