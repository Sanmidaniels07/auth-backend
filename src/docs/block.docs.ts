/**
 * @swagger
 * tags:
 *   name: Blocks
 *   description: Block and unblock other users
 */

/**
 * @swagger
 * /api/blocks:
 *   get:
 *     summary: List users the authenticated user has blocked
 *     description: Requires authentication.
 *     tags:
 *       - Blocks
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
 *         description: Blocked users fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/blocks/{userId}:
 *   post:
 *     summary: Block a user
 *     description: Requires authentication. Also removes any mutual follow relationship between the two users.
 *     tags:
 *       - Blocks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: User blocked successfully
 *       400:
 *         description: Cannot block yourself, or already blocked
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: User not found
 *   delete:
 *     summary: Unblock a user
 *     description: Requires authentication.
 *     tags:
 *       - Blocks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unblocked successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Not blocking this user
 */

export {};
