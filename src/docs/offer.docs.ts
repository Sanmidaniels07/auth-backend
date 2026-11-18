/**
 * @swagger
 * tags:
 *   name: Offer
 *   description: >-
 *     Make an offer in chat. A buyer offers a price for something a seller sells; the seller accepts, counters or
 *     declines; either side can accept the other's counter. An accepted offer becomes a payment link reserved for
 *     that buyer. Offers appear in the chat as messages with an `offer` card (GET /api/conversations/{id}/messages),
 *     pushed live with message:new and refreshed with message:updated. Pending offers lapse after 48 hours
 *     (expiresAt - shown as expired; they can't be answered).
 */

/**
 * @swagger
 * /api/offers:
 *   post:
 *     summary: Make an offer to the seller in a chat
 *     description: >-
 *       The other person in the one-to-one chat must be an approved seller with a store that isn't suspended. For a
 *       listed product (productId - must be published, from that store, with enough stock) the title and category come
 *       from it; otherwise give a title. A buyer's new offer withdraws their previous pending one in the chat. Stores
 *       under review cap price x quantity (utils/sellerReview). Returns the offer card message; the seller is notified.
 *     tags:
 *       - Offer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [conversationId, price]
 *             properties:
 *               conversationId:
 *                 type: string
 *               productId:
 *                 type: string
 *               title:
 *                 type: string
 *                 example: Red velvet cake (8 inch)
 *               price:
 *                 type: number
 *                 description: Naira per item.
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               note:
 *                 type: string
 *                 maxLength: 300
 *     responses:
 *       201:
 *         description: The offer card message
 *       400:
 *         description: Not a chat with a seller, sold out, over the new-store limit, or missing product/title
 *       403:
 *         description: Blocked
 */

/**
 * @swagger
 * /api/offers/{id}/respond:
 *   post:
 *     summary: Accept, counter or decline an offer
 *     description: >-
 *       Only the other side of the offer can answer it, once, while it's pending and not expired (409 if already
 *       answered). COUNTER needs a price and posts a new offer card (the old one shows "countered"). The seller must
 *       give categoryId for a described item (it sets the commission) and may give deliveryFee when their store has no
 *       delivery zones (default free). ACCEPT creates a payment link (/pay/{code}) at the agreed price that only the
 *       buyer can pay - with the store's delivery zones if it has any, else the agreed fee; if the link can't be made
 *       the offer goes back to pending. The other side is notified. For an offer on a listed product, paying the
 *       link also takes the quantity from that listing's stock (the link shows as sold out when the listing is, and a
 *       payment that lands after the listing sold out is cancelled and refunded).
 *     tags:
 *       - Offer
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
 *                 enum: [ACCEPT, DECLINE, COUNTER]
 *               price:
 *                 type: number
 *               categoryId:
 *                 type: string
 *               deliveryFee:
 *                 type: number
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: "{ status } - or, for COUNTER, the new offer card message"
 *       400:
 *         description: Own offer, expired, missing category or price
 *       409:
 *         description: Already answered
 */

/**
 * @swagger
 * /api/offers/{id}/withdraw:
 *   post:
 *     summary: Take back your own pending offer
 *     tags:
 *       - Offer
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
 *         description: Withdrawn
 *       403:
 *         description: Not your offer
 */
