/**
 * @swagger
 * tags:
 *   name: PaymentLink
 *   description: Protected payment links sellers share in DMs, WhatsApp or their bio - the buyer pays through Nestly and gets the usual order protection
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentLinkInput:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: Red velvet cake (8 inch)
 *         description:
 *           type: string
 *         price:
 *           type: number
 *           description: Naira, per item.
 *         quantity:
 *           type: integer
 *           description: How many can be bought through the link (default 1 for a one-off deal). When it reaches 0 the link shows as sold out.
 *         categoryId:
 *           type: string
 *           description: Sets the commission, as for listed products.
 *         images:
 *           type: array
 *           maxItems: 6
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               isPrimary:
 *                 type: boolean
 *         deliveryType:
 *           type: string
 *           enum: [DELIVERY, PICKUP, STORE_OPTIONS]
 *           description: DELIVERY - the seller delivers for deliveryFee. PICKUP - from the store's address (needs one). STORE_OPTIONS - the buyer chooses one of the store's delivery zones or pickup points when paying and pays that option's fee (needs at least one).
 *         deliveryFee:
 *           type: number
 *           description: Agreed with the buyer; 0 = free. Only for DELIVERY.
 *         deliveryVehicle:
 *           type: string
 *           enum: [BIKE, CAR, TRUCK]
 *           description: Smallest vehicle that can carry it (default BIKE). For STORE_OPTIONS only zones with that vehicle or bigger are offered.
 */

/**
 * @swagger
 * /api/payment-links:
 *   post:
 *     summary: Create a payment link
 *     description: Requires an approved seller with a store that isn't suspended. The item is kept as a PRIVATE product - never listed, searched or shown on the store, and not editable through the product endpoints. Returns the link with its `code`; the website's pay page is /pay/{code}.
 *     tags:
 *       - PaymentLink
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/PaymentLinkInput'
 *               - required: [title, price, categoryId, deliveryType]
 *     responses:
 *       201:
 *         description: Payment link created
 *       400:
 *         description: Pickup chosen but the store has no address
 *       403:
 *         description: Not an approved seller, or the store is suspended
 */

/**
 * @swagger
 * /api/payment-links/me:
 *   get:
 *     summary: The seller's payment links
 *     description: Requires an approved seller. Newest first, deleted links left out. Each has `quantity` (still available), `isActive` and `sales` - `{ orders, units, revenue }` from paid orders, cancelled items left out.
 *     tags:
 *       - PaymentLink
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment links fetched successfully
 */

/**
 * @swagger
 * /api/payment-links/{id}:
 *   patch:
 *     summary: Edit, pause or resume a payment link
 *     description: Requires the owning seller. Any field of PaymentLinkInput, plus `isActive` (false pauses it - buyers see it but can't pay). `images`, when sent, replace the photos. Orders already placed keep their copy of the item.
 *     tags:
 *       - PaymentLink
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
 *             allOf:
 *               - $ref: '#/components/schemas/PaymentLinkInput'
 *               - type: object
 *                 properties:
 *                   isActive:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Payment link updated
 *       404:
 *         description: Payment link not found
 *   delete:
 *     summary: Delete a payment link
 *     description: Requires the owning seller. The link stops working; orders already paid through it are kept.
 *     tags:
 *       - PaymentLink
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
 *         description: Payment link deleted
 *       404:
 *         description: Payment link not found
 */

/**
 * @swagger
 * /api/payment-links/{code}:
 *   get:
 *     summary: A payment link as the buyer sees it
 *     description: Public (login optional). `availability` is AVAILABLE, SOLD_OUT or PAUSED. `isOwner` is true for the seller who made it. `pickupAddress` is set for pickup links. For STORE_OPTIONS links, `shippingOptions` lists the zones and pickup points the buyer can choose (only ones whose vehicle can carry the item). 404 for deleted links and suspended stores.
 *     tags:
 *       - PaymentLink
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment link fetched successfully
 *       404:
 *         description: This payment link doesn't exist or has been removed
 */

/**
 * @swagger
 * /api/payment-links/{code}/pay:
 *   post:
 *     summary: Start paying through a payment link
 *     description: Requires authentication. Creates a pending order (the buyer's cart is untouched) and a Paystack transaction - open it with `accessCode` (popup) or `authorizationUrl`, then confirm with GET /api/checkout/verify/{reference} as for cart orders. From then on it's a normal order - delivery code, buyer protection, seller notified, payout split. Sellers can't pay their own link.
 *     tags:
 *       - PaymentLink
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [addressId]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 default: 1
 *               addressId:
 *                 type: string
 *               shippingOptionId:
 *                 type: string
 *                 description: Required for STORE_OPTIONS links - one of the link's `shippingOptions`; its fee is charged.
 *               deliveryPhone:
 *                 type: string
 *                 description: Defaults to the address's phone.
 *               note:
 *                 type: string
 *                 maxLength: 500
 *                 description: For the seller. Phone numbers, emails and handles are hidden.
 *     responses:
 *       201:
 *         description: Payment started - `{ orderId, reference, accessCode, authorizationUrl, total }`
 *       400:
 *         description: Own link, paused, sold out or not enough left
 *       404:
 *         description: Link or address not found
 */
