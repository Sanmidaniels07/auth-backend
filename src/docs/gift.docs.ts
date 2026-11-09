/**
 * @swagger
 * tags:
 *   - name: Gifts
 *     description: >
 *       Gift links. The sender pays for one item and picks the seller's delivery
 *       zone the recipient lives in (or a pickup point). The recipient opens
 *       /gift/{code}, signs in and adds their own address - only then does the
 *       seller get the order. Payments are not split: the money stays with Nestly
 *       until the gift is accepted. Declined, cancelled or unclaimed gifts (7 days)
 *       are refunded in full through Paystack.
 */

/**
 * @swagger
 * /api/gifts:
 *   post:
 *     summary: Send a gift (starts the payment)
 *     description: >
 *       Requires authentication. Creates a PENDING order with no address and a
 *       gift in status UNPAID, then a Paystack transaction (no split). Complete the
 *       payment with the returned accessCode, then confirm it with
 *       GET /api/checkout/verify/{reference} as for any order - the gift becomes
 *       SENT (7 days to accept), the sender gets the link and a recipient on
 *       Nestly is notified. Stock is held for 15 minutes while paying.
 *     tags: [Gifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, shippingOptionId, recipientName]
 *             properties:
 *               productId: { type: string }
 *               variationId: { type: string, description: Required for products sold in options }
 *               quantity: { type: integer, minimum: 1, maximum: 10, default: 1 }
 *               shippingOptionId: { type: string, description: "The store's delivery zone where the recipient lives, or a pickup point" }
 *               recipientId: { type: string, description: "Someone on Nestly - notified as soon as it's paid" }
 *               recipientName: { type: string, maxLength: 60 }
 *               message: { type: string, maxLength: 300 }
 *               showPrice: { type: boolean, default: false, description: Whether the recipient sees the price }
 *               source: { type: string, description: Traffic source (optional) }
 *           example:
 *             productId: cmvkvcu8s0013a21ydimz22n5
 *             shippingOptionId: cmw0zone1
 *             recipientId: cmuser123
 *             recipientName: Tolu
 *             message: Happy birthday!
 *     responses:
 *       201:
 *         description: Gift created - complete the payment to send it
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Gift created - complete the payment to send it
 *               data: { code: "Hk3mP9xQwe", orderId: "cm...", reference: "NESTLY_...", accessCode: "...", authorizationUrl: "https://checkout.paystack.com/...", total: 26500 }
 *       400:
 *         description: >
 *           Validation error, missing option (size/colour), not enough stock, the
 *           zone can't carry the item, gifting yourself or from your own store
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Item not available, or recipient not found (or blocked)
 *       409:
 *         description: Held by other buyers right now (stock hold)
 *   get:
 *     summary: Gifts you sent or received
 *     description: Requires authentication. Unpaid gifts are not listed.
 *     tags: [Gifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: box
 *         schema: { type: string, enum: [sent, received], default: sent }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, maximum: 50 }
 *     responses:
 *       200:
 *         description: Gifts fetched successfully (each as in GET /api/gifts/{code})
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/gifts/{code}:
 *   get:
 *     summary: The gift page
 *     description: >
 *       Optional authentication - the link can be opened before signing in.
 *       role is SENDER, RECIPIENT or VIEWER. status is UNPAID, SENT, CLAIMED,
 *       DECLINED, EXPIRED or CANCELLED. The price is hidden from everyone but the
 *       sender unless showPrice. Only the recipient (after accepting) gets
 *       progress with the delivery code and address; the sender gets payment and
 *       senderProgress, never the recipient's address or code. Unpaid gifts are
 *       404 for everyone but the sender.
 *     tags: [Gifts]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Gift fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 code: Hk3mP9xQwe
 *                 status: SENT
 *                 role: VIEWER
 *                 canClaim: true
 *                 sender: { id: "cm...", name: "Daniel", username: "daniel", avatar: null }
 *                 recipientName: Tolu
 *                 message: Happy birthday!
 *                 item: { title: "Red velvet cupcakes (12)", image: "https://...", quantity: 1, unitPrice: null }
 *                 delivery: { type: DELIVERY, optionName: "Lekki & VI", state: Lagos, areas: ["Lekki", "Victoria Island"] }
 *                 expiresAt: "2026-11-16T10:00:00.000Z"
 *       404:
 *         description: This gift link doesn't exist
 */

/**
 * @swagger
 * /api/gifts/{code}/claim:
 *   post:
 *     summary: Accept a gift and add your delivery details
 *     description: >
 *       Requires authentication. Anyone with an open link can accept it; a gift
 *       sent to someone on Nestly can only be accepted by them. For delivery,
 *       addressId (one of your addresses) is required and must be in the state
 *       the sender paid for. The seller is notified once accepted.
 *     tags: [Gifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               addressId: { type: string }
 *               deliveryPhone: { type: string, example: "0803 123 4567" }
 *     responses:
 *       200:
 *         description: Gift accepted - the seller is preparing it (returns the gift page, with progress)
 *       400:
 *         description: Missing/out-of-zone address, your own gift, or it can't be accepted any more
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: This gift is for someone else
 *       404:
 *         description: Gift or address not found
 *       409:
 *         description: Already accepted (by someone else, or a double click)
 */

/**
 * @swagger
 * /api/gifts/{code}/decline:
 *   post:
 *     summary: Decline a gift sent to you
 *     description: >
 *       Requires authentication. Only the named recipient of a gift that hasn't
 *       been accepted. The order is cancelled, stock restored and the sender
 *       refunded through Paystack (admins are alerted if that fails).
 *     tags: [Gifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Gift declined - the sender is being refunded
 *       400:
 *         description: It can't be declined any more
 *       403:
 *         description: Only the person this gift is for can decline it
 *       409:
 *         description: It was accepted or ended at the same moment
 */

/**
 * @swagger
 * /api/gifts/{code}/cancel:
 *   post:
 *     summary: Cancel a gift you sent (before it's accepted)
 *     description: >
 *       Requires authentication (the sender). Cancels the order, restores stock
 *       and refunds the sender through Paystack.
 *     tags: [Gifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Gift cancelled - you're being refunded
 *       400:
 *         description: Already accepted or ended
 *       404:
 *         description: Gift not found (or not yours)
 *       409:
 *         description: It was accepted or ended at the same moment
 */

export {};
