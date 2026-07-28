/**
 * @swagger
 * tags:
 *   name: Story
 *   description: Ephemeral 24-hour stories. All endpoints require authentication. Replying to a story is not a story-specific action - use the existing Conversation endpoints (POST /api/conversations then POST /api/conversations/{id}/messages) to message the author directly.
 */

/**
 * @swagger
 * /api/stories:
 *   post:
 *     summary: Create a story
 *     description: Media must be uploaded first via POST /api/uploads to get mediaUrl/mediaType. expiresAt is set server-side to 24 hours from creation.
 *     tags:
 *       - Story
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mediaUrl
 *               - mediaType
 *             properties:
 *               mediaUrl:
 *                 type: string
 *               mediaType:
 *                 type: string
 *                 enum: [IMAGE, VIDEO]
 *               caption:
 *                 type: string
 *     responses:
 *       201:
 *         description: Story created successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *   get:
 *     summary: Get the active stories feed
 *     description: Returns unexpired stories from yourself and everyone you follow, grouped by author. Each group includes `hasUnseen`, and each story includes `seenByMe` and `reactionCount`. Your own group is always first, others ordered by most recent activity.
 *     tags:
 *       - Story
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stories fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/stories/{id}:
 *   get:
 *     summary: Get a single story
 *     description: Records a StoryView for the requester unless they're the author. Not filtered by expiry - a direct link still resolves until the story is actually deleted.
 *     tags:
 *       - Story
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
 *         description: Story fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Story not found
 *   delete:
 *     summary: Delete a story early
 *     description: Author only.
 *     tags:
 *       - Story
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
 *         description: Story deleted successfully
 *       403:
 *         description: Not the author of this story
 *       404:
 *         description: Story not found
 */

/**
 * @swagger
 * /api/stories/{id}/viewers:
 *   get:
 *     summary: Get who has viewed a story
 *     description: Author only. Paginated.
 *     tags:
 *       - Story
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
 *         description: Viewers fetched successfully
 *       403:
 *         description: Not the author of this story
 *       404:
 *         description: Story not found
 */

/**
 * @swagger
 * /api/stories/{id}/react:
 *   post:
 *     summary: React to a story with an emoji
 *     description: One reaction per user per story - reacting again replaces the previous emoji.
 *     tags:
 *       - Story
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
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: "❤️"
 *     responses:
 *       200:
 *         description: Reaction added successfully
 *       404:
 *         description: Story not found
 *   delete:
 *     summary: Remove your reaction from a story
 *     tags:
 *       - Story
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
 *         description: Reaction removed successfully
 *       404:
 *         description: No reaction found to remove
 */

export {};
