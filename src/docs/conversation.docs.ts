/**
 * @swagger
 * tags:
 *   name: Conversation
 *   description: |
 *     Direct messaging between users. Real-time events over the existing Socket.IO connection (to each user's id room):
 *     "message:new" (a message for you), "message:updated" (a reaction changed or a message was unsent - sent to everyone in the chat),
 *     "message:read" ({ conversationId, readerId }), "typing" ({ conversationId }) and "presence" ({ userId, online, lastSeenAt } - when
 *     someone you have a chat with comes online or leaves).
 *
 *     A message includes `replyTo` (the quoted message: id, content, senderId, deletedAt, sender.name, first media item, product.title),
 *     `product` (a shared product card: id, title, price, status, primary image, store name/slug), `reactions` ([{ emoji, userId }]) and
 *     `deletedAt` (unsent - content, media, product and reactions are cleared).
 */

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Get or create a 1:1 conversation with another user
 *     description: Requires authentication. Returns the existing conversation between the two users if one already exists, otherwise creates it.
 *     tags:
 *       - Conversation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Conversation ready (created or already existed)
 *       400:
 *         description: Cannot message yourself
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: User not found
 *   get:
 *     summary: List the authenticated user's conversations
 *     description: Requires authentication. Paginated, ordered by most recent activity. Each entry includes the other participant (with `online`, `lastSeenAt` and `store` - name and slug if they sell), the last message preview (with `product.title` when it's a product card), and an unread count.
 *     tags:
 *       - Conversation
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
 *         description: Conversations fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/conversations/{id}/messages:
 *   get:
 *     summary: Get messages in a conversation
 *     description: Requires authentication and being a participant in the conversation.
 *     tags:
 *       - Conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Messages fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Conversation not found (or you're not a participant)
 *   post:
 *     summary: Send a message
 *     description: Requires authentication and being a participant. Delivered in real time to the other participant via Socket.IO if they're connected. In a conversation involving a seller (anyone with a store), phone numbers, bank account numbers, emails, @handles and WhatsApp/Instagram/Facebook/TikTok/Telegram/X/Snapchat links in `content` are replaced with "••••••" before saving, so buyers and sellers keep talking and paying on Nestly; the response has `contactHidden: true` when that happened.
 *     tags:
 *       - Conversation
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
 *             description: Needs at least one of content, media or productId.
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *               media:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [IMAGE, VIDEO]
 *               replyToId:
 *                 type: string
 *                 description: Quote an earlier message in this conversation.
 *               productId:
 *                 type: string
 *                 description: Share a product (published or sold out, store not suspended) as a card.
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Empty message, or replyToId isn't in this conversation
 *       404:
 *         description: Product not available
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Conversation not found (or you're not a participant)
 */

/**
 * @swagger
 * /api/conversations/{id}/messages/{messageId}/reaction:
 *   put:
 *     summary: React to a message (or remove your reaction)
 *     description: Requires authentication and being a participant. One reaction per person per message - reacting again replaces it; emoji null removes it. Everyone in the chat gets "message:updated".
 *     tags:
 *       - Conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [emoji]
 *             properties:
 *               emoji:
 *                 type: string
 *                 nullable: true
 *                 example: "❤️"
 *     responses:
 *       200:
 *         description: Reaction saved (returns the updated message)
 *       400:
 *         description: The message was deleted
 *       404:
 *         description: Conversation or message not found
 */

/**
 * @swagger
 * /api/conversations/{id}/messages/{messageId}:
 *   delete:
 *     summary: Unsend your message for everyone
 *     description: Requires authentication; only the sender can do it. The message stays in place as "This message was deleted" - its text, photos, product card and reactions are removed. Everyone in the chat gets "message:updated".
 *     tags:
 *       - Conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted (returns the updated message)
 *       403:
 *         description: Not your message
 *       404:
 *         description: Conversation or message not found
 */

/**
 * @swagger
 * /api/conversations/{id}/read:
 *   patch:
 *     summary: Mark a conversation's messages as read
 *     description: Requires authentication and being a participant. Marks all messages from the other participant(s) as read.
 *     tags:
 *       - Conversation
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
 *         description: Conversation marked as read
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Conversation not found (or you're not a participant)
 */

export {};
