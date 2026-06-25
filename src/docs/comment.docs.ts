/**
 * @swagger
 * /api/comments/{postId}:
 *   post:
 *     summary: Create comment
 *     tags:
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
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
 *                 example: Great article
 *     responses:
 *       201:
 *         description: Comment created
 */

/**
 * @swagger
 * /api/comments/post/{postId}:
 *   get:
 *     summary: Get comments for a post
 *     tags:
 *       - Comments
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comments fetched successfully
 */

/**
 * @swagger
 * /api/comments/{id}:
 *   patch:
 *     summary: Update your own comment
 *     tags:
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
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
 *                 example: Updated comment
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete your own comment
 *     tags:
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */



export {};
