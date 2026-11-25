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
 *     description: Requires an approved seller. Newest first, deleted links left out. Each has `quantity` (still available), `isActive`, `fromListing` (shared from a product in the shop - then `productId` is set and `sales` only counts orders made through the link) and `sales` - `{ orders, units, revenue }` from paid orders, cancelled items left out.
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
 * /api/payment-links/from-product/{productId}:
 *   post:
 *     summary: Get the pay link for a product in the shop
 *     description: Requires the seller who owns the product. Returns the product's pay link, creating it the first time (later calls return the same link, turned back on if it was paused or deleted). The buyer pays for the listing itself, with or without an account - its current price, photos and stock - and chooses one of the store's delivery zones or pickup points. The link has `fromListing` true and `productId` set. Editing it (PATCH) only changes `deliveryType`, `deliveryFee` and `isActive` - title, price, photos and stock are edited on the product. Sales through the link come out of the product's stock. Products with options (size / colour) work too: the pay page gets `options` and `variations` and the buyer sends `variationId` when paying (each combination's own price and stock). 400 when the product is a draft, removed, or the store has no delivery zones or pickup points; 404 when it isn't the seller's.
 *     tags:
 *       - PaymentLink
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pay link ready
 *       400:
 *         description: The product can't be sold through a link
 *       404:
 *         description: Product not found
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
 *     description: Public (login optional). `availability` is AVAILABLE, SOLD_OUT or PAUSED. `isOwner` is true for the seller who made it. `reserved` is true for a link made from an accepted offer in chat - only that buyer can pay it (`reservedForViewer` true for them; others get 403 on pay and guest-pay). `pickupAddress` is set for pickup links. For STORE_OPTIONS links, `shippingOptions` lists the zones and pickup points the buyer can choose (only ones whose vehicle can carry the item). The product's `description`, `brand`, `condition`, `highlights` and `specifications` are included so buyers can read everything the seller listed. 404 for deleted links and suspended stores.
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
 *     description: Requires authentication. Creates a pending order (the buyer's cart is untouched) and a Paystack transaction - open it with `accessCode` (popup) or `authorizationUrl`, then confirm with GET /api/checkout/verify/{reference} as for cart orders. From then on it's a normal order - delivery code, buyer protection, seller notified, payout split. Sellers can't pay their own link. Stock is held for 15 minutes while the buyer pays - 409 when others are mid-payment for what's left (see POST /api/checkout/initiate for holds and sold-out refunds). Takes the same optional `source` as checkout.
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
 *               variationId:
 *                 type: string
 *                 description: Required when the link is for a shop product with options - one of the link's `variations` (active, in stock).
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

/**
 * @swagger
 * /api/payment-links/{code}/guest-pay:
 *   post:
 *     summary: Pay through a payment link without an account (guest checkout)
 *     description: |
 *       No login. For buyers arriving from a seller's Instagram or WhatsApp. Behind the scenes the buyer gets a guest account (`isGuest`, no password) so the order works like any other - stock hold, delivery code, seller notified, payout split, emails.
 *       - An email that belongs to a full Nestly account gets **409** - log in and use POST /pay instead.
 *       - An email already used for guest checkout reuses that guest account (no session is created).
 *       - `address`, `city` and `state` are required unless the buyer collects it (PICKUP links, or a pickup point on STORE_OPTIONS links).
 *       - `referralCode` (the store's ?ref= code) counts the new guest for that store, as at signup.
 *       Returns `guestToken` - the secret for the buyer's private tracking page (/orders/track/{guestToken}), also linked from the order emails. Confirm the payment with POST /guest-orders/{token}/verify.
 *       Rate limited: 8 per 10 minutes per IP (429).
 *     tags:
 *       - PaymentLink
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
 *             required: [name, email, phone]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tola Adebayo
 *               email:
 *                 type: string
 *                 example: tola@example.com
 *               phone:
 *                 type: string
 *                 example: 0803 123 4567
 *                 description: The seller calls this number to deliver.
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               shippingOptionId:
 *                 type: string
 *                 description: Required for STORE_OPTIONS links.
 *               variationId:
 *                 type: string
 *                 description: Required when the link is for a shop product with options - one of the link's `variations` (active, in stock).
 *               note:
 *                 type: string
 *                 maxLength: 500
 *               source:
 *                 type: string
 *               referralCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment started - `{ orderId, reference, accessCode, authorizationUrl, total, guestToken }`
 *       400:
 *         description: Paused, sold out, not enough left, missing address or delivery choice
 *       404:
 *         description: Link not found
 *       409:
 *         description: The email belongs to a Nestly account - log in to pay
 *       429:
 *         description: Too many attempts
 */

/**
 * @swagger
 * /api/payment-links/guest-orders/{token}:
 *   get:
 *     summary: A guest's order (private tracking page)
 *     description: No login - the token from guest checkout is the access. Same shape as GET /api/orders/{id} (items with delivery state, shipping with delivery codes, timeline), plus `store`, `paymentLinkCode` and `buyer` - `{ name, email (masked), isGuest }`. `isGuest` false means they've set up their account, so the order is also under My orders.
 *     tags:
 *       - PaymentLink
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The order
 *       404:
 *         description: No order for this link
 */

/**
 * @swagger
 * /api/payment-links/guest-orders/{token}/verify:
 *   post:
 *     summary: Confirm a guest's payment
 *     description: Call after the Paystack popup succeeds (the webhook also confirms it). Idempotent. Returns the order as GET /guest-orders/{token}.
 *     tags:
 *       - PaymentLink
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment confirmed - the order
 *       400:
 *         description: Payment not successful or amount mismatch
 */

/**
 * @swagger
 * /api/payment-links/guest-orders/{token}/items/{orderItemId}/confirm-delivery:
 *   post:
 *     summary: A guest confirms their item arrived
 *     description: Same rules as POST /api/orders/items/{orderItemId}/confirm-delivery - only for items the seller marked delivered. Returns the order.
 *     tags:
 *       - PaymentLink
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: orderItemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Confirmed - the order
 *       400:
 *         description: Not marked delivered yet, or already confirmed
 *       404:
 *         description: Item not in this order
 */

/**
 * @swagger
 * /api/payment-links/guest-orders/{token}/claim:
 *   post:
 *     summary: Turn the guest account into a full account
 *     description: |
 *       Sets a password and signs the buyer in (returns `{ emailSent: false, accessToken, user }` and sets the refresh cookie, as at login). A verification email is sent, as at signup.
 *       If the guest account has other orders, this link alone isn't enough proof (anyone can type an email at checkout): a set-password link is emailed instead and the response is `{ emailSent: true, email }` (masked).
 *     tags:
 *       - PaymentLink
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Account ready (signed in), or set-password link emailed
 *       400:
 *         description: The order already belongs to a full account - log in
 */
