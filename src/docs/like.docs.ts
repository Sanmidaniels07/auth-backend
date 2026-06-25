/**
 * @swagger
 * tags:
 *   name: Likes
 *   description: Like APIs
 */

/**
 * @swagger
 * /api/likes/{postId}:
 *   post:
 *     summary: Like a post
 *     tags:
 *       - Likes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post to like
 *     responses:
 *       201:
 *         description: Post liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Post liked
 *       400:
 *         description: Post already liked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */

/**
 * @swagger
 * /api/likes/{postId}:
 *   delete:
 *     summary: Unlike a post
 *     tags:
 *       - Likes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post to unlike
 *     responses:
 *       200:
 *         description: Post unliked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Post unliked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Like not found
 */

/**
 * @swagger
 * /api/likes/{postId}:
 *   get:
 *     summary: Get total likes for a post
 *     tags:
 *       - Likes
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post
 *     responses:
 *       200:
 *         description: Likes fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Likes fetched
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalLikes:
 *                       type: integer
 *                       example: 12
 *       404:
 *         description: Post not found
 */

export {};