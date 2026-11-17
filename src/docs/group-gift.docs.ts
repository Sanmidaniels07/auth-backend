/**
 * @swagger
 * tags:
 *   name: GroupGift
 *   description: >-
 *     Chip in on a gift. Someone starts a group gift for a friend (a listed product, the seller's delivery zone or
 *     pickup point, a deadline); friends each pay part of it through Paystack. Nestly holds every contribution. When
 *     they reach the target a normal gift order is placed at the price locked when it started (see Gift) - the
 *     recipient is told and claims it with their address. Deadline passed, called off, couldn't be placed, or the
 *     placed gift was declined / not claimed - everyone is refunded. Contribution payments use references starting
 *     NESTLY_CHIPIN_ and are confirmed by the Paystack webhook or POST /contributions/{reference}/verify.
 */

/**
 * @swagger
 * /api/group-gifts:
 *   post:
 *     summary: Start a group gift
 *     description: >-
 *       Same checks as sending a gift (published product, not your own store, option and stock, delivery option,
 *       recipient on Nestly optional). target = item price + delivery fee, locked now. deadline between 12 hours and
 *       30 days away. Stores under review keep their order cap. Returns the group gift as GET /{code}.
 *     tags:
 *       - GroupGift
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, shippingOptionId, recipientName, deadline]
 *             properties:
 *               productId:
 *                 type: string
 *               variationId:
 *                 type: string
 *               shippingOptionId:
 *                 type: string
 *               recipientId:
 *                 type: string
 *               recipientName:
 *                 type: string
 *                 example: Tolu
 *               message:
 *                 type: string
 *               deadline:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Started
 */

/**
 * @swagger
 * /api/group-gifts/{code}:
 *   get:
 *     summary: A group gift (public, login optional)
 *     description: >-
 *       status OPEN, FUNDED, CANCELLED, EXPIRED or FAILED; target, raised, remaining, deadline; contributors (names -
 *       or null when hidden - and messages, no amounts); myContribution; isOrganizer; giftCode (organiser, once funded).
 *       The recipient, while it's open, only gets { surprise true, recipientName }.
 *     tags:
 *       - GroupGift
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The group gift
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /api/group-gifts/{code}/contribute:
 *   post:
 *     summary: Chip in
 *     description: >-
 *       Starts a Paystack payment (no split - Nestly holds it). amount between N500 (or what's left, if less) and
 *       what's left, counting payments others started in the last 30 minutes. Not for the recipient. Returns
 *       { reference, accessCode, authorizationUrl, amount }.
 *     tags:
 *       - GroupGift
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
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *               message:
 *                 type: string
 *                 maxLength: 200
 *               hideName:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Payment started
 *       400:
 *         description: Closed, past the deadline, too small or more than what's left
 */

/**
 * @swagger
 * /api/group-gifts/contributions/{reference}/verify:
 *   post:
 *     summary: Confirm your contribution after the Paystack popup
 *     description: >-
 *       Idempotent (the webhook does the same). Reaching the target places the gift; if two last payments push it over,
 *       the extra is refunded to the latest. A payment landing after the group gift closed is refunded. Returns the
 *       group gift.
 *     tags:
 *       - GroupGift
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
 *         description: Confirmed
 */

/**
 * @swagger
 * /api/group-gifts/{code}/cancel:
 *   post:
 *     summary: Call off a group gift (organiser, while open)
 *     description: Everyone who chipped in is refunded and told.
 *     tags:
 *       - GroupGift
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Called off
 *       403:
 *         description: Not the organiser
 */
