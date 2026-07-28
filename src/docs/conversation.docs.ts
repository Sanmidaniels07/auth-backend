/**
 * @swagger
 * tags:
 *   name: Conversation
 *   description: Direct messaging between users. New messages are also pushed in real time over the existing Socket.IO connection as a "message:new" event to the recipient's user-id room.
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
 *     description: Requires authentication. Paginated, ordered by most recent activity. Each entry includes the other participant, the last message preview, and an unread count.
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
 *     description: Requires authentication and being a participant. Delivered in real time to the other participant via Socket.IO if they're connected.
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
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Conversation not found (or you're not a participant)
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
