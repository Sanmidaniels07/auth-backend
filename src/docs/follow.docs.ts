/**
 * @swagger
 * tags:
 *   name: Follow
 *   description: Follow relationships between users
 */

/**
 * @swagger
 * /api/follow/{userId}:
 *   post:
 *     summary: Follow a user
 *     description: Requires authentication. Cannot follow yourself or a user you already follow.
 *     tags:
 *       - Follow
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
 *         description: Followed successfully
 *       400:
 *         description: Cannot follow yourself, or already following
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: User not found
 *   delete:
 *     summary: Unfollow a user
 *     description: Requires authentication.
 *     tags:
 *       - Follow
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
 *         description: Unfollowed successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Not following this user
 */

/**
 * @swagger
 * /api/follow/{userId}/status:
 *   get:
 *     summary: Check if the authenticated user follows another user
 *     description: Requires authentication.
 *     tags:
 *       - Follow
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
 *         description: Follow status fetched successfully, returns a boolean isFollowing field
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/follow/{userId}/followers:
 *   get:
 *     summary: Get a user's followers
 *     description: Public endpoint, paginated.
 *     tags:
 *       - Follow
 *     security: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: Followers fetched successfully
 */

/**
 * @swagger
 * /api/follow/{userId}/following:
 *   get:
 *     summary: Get the users a user is following
 *     description: Public endpoint, paginated.
 *     tags:
 *       - Follow
 *     security: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: Following fetched successfully
 */

export {};
