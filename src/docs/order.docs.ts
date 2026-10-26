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
 *     description: Paginated, optionally filtered by order status. Items show the listing as it was ordered (see GET /api/orders/{id}).
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
 *     description: |
 *       Returns full order detail for the order's owner:
 *       - `timeline` - order-level steps with real dates from the order's event history (a step's date is when its last item got there).
 *       - `events` - the raw history (PAID, SHIPPED, DELIVERED, CONFIRMED, CANCELLED, PROBLEM_REPORTED...), with the actor (BUYER, SELLER, SYSTEM).
 *       - `shipping[].deliveryCode` - the buyer's 6-digit code per seller, to hand over on delivery. Never exposed to sellers.
 *       - per item: `shippedAt`, `deliveredAt`, `deliveryConfirmedAt`, `deliveryConfirmedBy` (CODE, BUYER, AUTO), `awaitingConfirmation` and `returnWindowEndsAt` (7 days after confirmation).
 *       - per item: the listing as it was ordered - `productTitle`, `productImage`, `productDescription`, `productBrand`, `productCondition`, `productSku`, `productHighlights`, `productSpecs` ([{ name, value }]), and for products with options `variantLabel` (e.g. "Size: Large · Flavour: Vanilla") and `variationId`. `product.title`/`product.images` show this copy too; `product.id` still points at the live listing. `listingChanged` is true when the seller has edited the listing since (price changes excluded - the paid price is locked).
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
 *     description: Requires an existing store. Only shows paid+ orders (unpaid PENDING orders are excluded), and only the seller's own items within each order - not other sellers' items in the same order. Each order includes `sellerNotes` holding only the note the buyer left for this store (empty if none). The `status` filter matches the seller's own OrderItem status, not the overall order status. `address` is where to deliver (fullName, address, city, state, country, postalCode) - never the address's phone or the buyer's email. `deliveryPhone` (the number to call to deliver) is included only for delivery orders while the seller's items are still on the way, otherwise null.
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
 *     description: Requires an existing store. Returns only the seller's own items within the order (shown as they were ordered - productTitle, productImage etc. - even if the listing was edited since), plus `sellerNotes` with only the note the buyer left for this store (empty if none). `address` is where to deliver (fullName, address, city, state, country, postalCode) - never the address's phone or the buyer's email. `deliveryPhone` (the number to call to deliver) is included only for delivery orders while the seller's items are still on the way, otherwise null.
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
 * /api/orders/seller/{id}/tracking-number:
 *   patch:
 *     summary: Set an order's shipment tracking number
 *     description: Requires an existing store and that the order contains the seller's products. Note - trackingNumber lives on the shared Order record, so for an order spanning multiple sellers, any of them setting it will overwrite the same field.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackingNumber
 *             properties:
 *               trackingNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tracking number updated successfully
 *       403:
 *         description: Seller has no store
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/orders/seller/items/{orderItemId}/status:
 *   patch:
 *     summary: Update the fulfillment status of one of the seller's order items
 *     description: |
 *       Since a single order can contain items from multiple sellers, sellers can only update the status of their OWN order items, not the order as a whole. The overall order status is automatically recomputed as the least-progressed status among its active (non-cancelled) items - e.g. the order only becomes SHIPPED once every seller's items have shipped.
 *
 *       Status can only move forward (PENDING -> PROCESSING -> SHIPPED -> DELIVERED); moving backward is rejected. The order must already be paid for. Delivered items can't be cancelled (the buyer requests a return instead).
 *
 *       **Delivering:** send the buyer's 6-digit `deliveryCode` with status DELIVERED to mark the item delivered *and* confirmed in one step (proof of handover). After 5 wrong codes the code locks. Without a code the item is delivered but awaits the buyer's confirmation (POST /api/orders/items/{orderItemId}/confirm-delivery); it auto-confirms after 5 days unless the buyer opens a return request.
 *
 *       The buyer is notified in-app on every change, and by email when items ship, are delivered or are cancelled.
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
 *               deliveryCode:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 description: Only with status DELIVERED - the buyer's handover code.
 *           example:
 *             status: DELIVERED
 *             deliveryCode: "482915"
 *     responses:
 *       200:
 *         description: Order item status updated successfully, returns the updated order with its recomputed overall status
 *       400:
 *         description: Order not yet paid, item already cancelled, delivered item cancelled, status moved backward, wrong/locked delivery code, or code format invalid
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not authorized to update this item
 *       404:
 *         description: Order item not found
 */

/**
 * @swagger
 * /api/orders/items/{orderItemId}/confirm-delivery:
 *   post:
 *     summary: Confirm receipt of a delivered item (buyer)
 *     description: The buyer confirms they received an item the seller marked DELIVERED without a delivery code. Starts the 7-day return window and notifies the seller. Not needed when the seller used the delivery code (already confirmed).
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
 *     responses:
 *       200:
 *         description: Delivery confirmed successfully, returns the item with deliveryConfirmedAt, deliveryConfirmedBy BUYER and returnWindowEndsAt
 *       400:
 *         description: Item not marked delivered yet, or already confirmed
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Order item not found (or not the caller's)
 */

export {};
