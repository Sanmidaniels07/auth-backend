/**
 * @swagger
 * tags:
 *   name: Live
 *   description: |
 *     Live selling. A seller with a fully set-up store schedules a live (or goes live now) and shares /live/{code}.
 *     Anyone can open the link; signed-in users tap "Remind me" and are reminded 24h and 15 minutes before, and when it starts.
 *     During the live, viewers watch (LiveKit), chat (Socket.IO namespace `/live`) and buy featured products at an optional live-only discount.
 *     Lives end by themselves after 60 minutes. Discounts still apply for 30 minutes after a live ends.
 *
 *     Socket.IO `/live` (auth token optional): emit `live:join {liveId}` (ack `{ok, viewers, card}`), `live:leave`, `live:chat {liveId, text}` (signed in; ack `{ok, message}`), `live:heart {liveId}`, `live:card {liveId, x, y, scale}` (seller only: product card position 0-1 and size 0.6-1.8).
 *     Receive `live:chat`, `live:message-removed`, `live:heart`, `live:viewers`, `live:pinned`, `live:card`, `live:products` (a product the seller added mid-live; full list), `live:status`, `live:purchase`, `live:stock`, `live:banned`, and `live:time-warning` (seller only).
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LiveInput:
 *       type: object
 *       required: [title, scheduledAt, products]
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 80
 *           example: Friday small chops sale
 *         description:
 *           type: string
 *           maxLength: 500
 *         coverImage:
 *           type: string
 *           format: uri
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           description: When it starts (up to 30 days ahead). A time up to 10 minutes in the past means "go live now".
 *         products:
 *           type: array
 *           minItems: 1
 *           maxItems: 20
 *           items:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: string
 *               discountPercent:
 *                 type: integer
 *                 minimum: 5
 *                 maximum: 80
 *                 nullable: true
 *                 description: Live-only discount on every option of the product.
 *     LiveProduct:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         slug: { type: string }
 *         title: { type: string }
 *         image: { type: string, nullable: true }
 *         price: { type: number, description: Lowest price across options }
 *         maxPrice: { type: number }
 *         discountPercent: { type: integer, nullable: true }
 *         livePrice: { type: number, nullable: true, description: Discounted "from" price while the discount is active }
 *         hasOptions: { type: boolean }
 *         stock: { type: integer }
 *         available: { type: boolean }
 *     Live:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         code: { type: string, description: "Share code - /live/{code}" }
 *         title: { type: string }
 *         description: { type: string, nullable: true }
 *         coverImage: { type: string, nullable: true }
 *         scheduledAt: { type: string, format: date-time }
 *         startedAt: { type: string, format: date-time, nullable: true }
 *         endedAt: { type: string, format: date-time, nullable: true }
 *         endsAt: { type: string, format: date-time, nullable: true, description: When a running live ends by itself }
 *         status: { type: string, enum: [SCHEDULED, LIVE, ENDED, CANCELLED] }
 *         endReason: { type: string, nullable: true, description: "ENDED_BY_SELLER, ENDED_BY_ADMIN, TIME_LIMIT, CANCELLED_BY_SELLER or NOT_STARTED" }
 *         pinnedProductId: { type: string, nullable: true }
 *         discountActive: { type: boolean }
 *         interestedCount: { type: integer }
 *         viewers: { type: integer }
 *         store:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             name: { type: string }
 *             slug: { type: string }
 *             logo: { type: string, nullable: true }
 *             city: { type: string, nullable: true }
 *             state: { type: string, nullable: true }
 *             isVerified: { type: boolean }
 *             rating: { type: number }
 *             sellerUserId: { type: string }
 *         products:
 *           type: array
 *           items: { $ref: '#/components/schemas/LiveProduct' }
 *     LiveChatMessage:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         text: { type: string }
 *         createdAt: { type: string, format: date-time }
 *         isSeller: { type: boolean }
 *         user:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             name: { type: string }
 *             avatar: { type: string, nullable: true }
 *     LiveVideoToken:
 *       type: object
 *       properties:
 *         url: { type: string, description: LiveKit server URL }
 *         token: { type: string, description: Short-lived LiveKit join token }
 */

/**
 * @swagger
 * /api/lives:
 *   get:
 *     summary: Lives on now and coming up (next 14 days)
 *     tags: [Live]
 *     parameters:
 *       - in: query
 *         name: store
 *         schema: { type: string }
 *         description: Only this store's lives (store slug).
 *     responses:
 *       200:
 *         description: "{ live: Live[], upcoming: Live[] }"
 *   post:
 *     summary: Schedule a live (or go live now) - fully set-up stores only
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LiveInput' }
 *     responses:
 *       201: { description: Live scheduled (Live plus orders and revenue) }
 *       400: { description: Bad time, too many upcoming lives (max 5), or products not in the store }
 *       403: { description: Store not set up (payout account, delivery, a published product) or suspended }
 *
 * /api/lives/me:
 *   get:
 *     summary: The seller's lives, with sales, plus whether they can go live
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "{ canGoLive, blockers: string[], videoReady, maxMinutes, lives: Live[] (with orders, revenue) }"
 *
 * /api/lives/{id}:
 *   patch:
 *     summary: Edit an upcoming live (moving the time tells the people waiting)
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LiveInput' }
 *     responses:
 *       200: { description: Live updated }
 *       400: { description: The live has already started }
 *
 * /api/lives/{id}/cancel:
 *   post:
 *     summary: Cancel an upcoming live (people waiting are told)
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Live cancelled }
 *
 * /api/lives/{id}/start:
 *   post:
 *     summary: Go live (from 60 minutes before the start time) - returns the seller's camera token
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: "{ live, video: LiveVideoToken }. Followers and \"Remind me\" people are told."
 *       400: { description: Too early, already ended, or another live is running }
 *       503: { description: Live video isn't configured (LIVEKIT_* env) }
 *
 * /api/lives/{id}/host-token:
 *   post:
 *     summary: Rejoin a running live as the seller (refresh / network drop)
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: "{ live, video: LiveVideoToken }" }
 *
 * /api/lives/{id}/end:
 *   post:
 *     summary: End a running live (seller or admin)
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Live ended }
 *
 * /api/lives/{id}/pin:
 *   post:
 *     summary: Pin a featured product for everyone watching (null unpins)
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId: { type: string, nullable: true }
 *     responses:
 *       200: { description: Pinned }
 *
 * /api/lives/{id}/messages/{messageId}:
 *   delete:
 *     summary: Remove a chat message
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: messageId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Removed }
 *
 * /api/lives/{id}/bans:
 *   post:
 *     summary: Block a viewer from chatting in this live (their messages are removed)
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200: { description: Blocked }
 *
 * /api/lives/{id}/summary:
 *   get:
 *     summary: How a live went - viewers, chat, orders, revenue, new followers and sign-ups
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: "Live plus durationMinutes, peakViewers, chatMessages, newFollowers, signUps, topProducts[]" }
 *
 * /api/lives/{code}:
 *   get:
 *     summary: The public live page (open to everyone)
 *     tags: [Live]
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: "Live plus referralCode, isOwner, isInterested, isBanned and the latest chat messages (LiveChatMessage[])"
 *       404: { description: Not found or store suspended }
 *
 * /api/lives/{code}/calendar.ics:
 *   get:
 *     summary: Add to calendar (iCalendar file with a 15-minute alarm)
 *     tags: [Live]
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: text/calendar
 *
 * /api/lives/{code}/interest:
 *   post:
 *     summary: Remind me
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: "{ isInterested, interestedCount }" }
 *   delete:
 *     summary: Stop reminding me
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: "{ isInterested, interestedCount }" }
 *
 * /api/lives/{code}/watch:
 *   post:
 *     summary: Watch-only video token (guests too - the website limits guests to a short preview)
 *     tags: [Live]
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: "LiveVideoToken plus guest: boolean" }
 *       400: { description: The live isn't on }
 *
 * /api/lives/{code}/buy:
 *   post:
 *     summary: Buy a featured product during (or just after) the live - returns a Paystack transaction
 *     tags: [Live]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, addressId, shippingOptionId]
 *             properties:
 *               productId: { type: string }
 *               variationId: { type: string, description: Required for products with options }
 *               quantity: { type: integer, minimum: 1, maximum: 20 }
 *               addressId: { type: string }
 *               shippingOptionId: { type: string, description: One of the store's delivery zones or pickup points }
 *               deliveryPhone: { type: string }
 *               note: { type: string, maxLength: 500 }
 *     responses:
 *       201:
 *         description: "{ orderId, reference, accessCode, authorizationUrl, unitPrice, total } - confirm with POST /api/checkout/verify"
 *       400: { description: Not started, sold out, option or delivery problem }
 */
