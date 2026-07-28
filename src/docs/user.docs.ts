/**
 * @swagger
 * tags:
 *   name: User
 *   description: User discovery and public profiles
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List users
 *     description: Public endpoint (personalized to exclude yourself if authenticated). Paginated, supports search by name/username.
 *     tags:
 *       - User
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users fetched successfully
 */

/**
 * @swagger
 * /api/users/suggested:
 *   get:
 *     summary: Get suggested users to follow
 *     description: Requires authentication. Excludes yourself and users you already follow, ordered by follower count.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Suggested users fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/users/{identifier}:
 *   get:
 *     summary: Get a public user profile
 *     description: Public endpoint (personalized if authenticated). `identifier` can be either a user id or a username. Returns location/website/socialLinks plus followersCount/followingCount/postsCount/profileViews. Logs a profile view (excluding self-views); the viewer is recorded if authenticated, otherwise logged anonymously.
 *     tags:
 *       - User
 *     security: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *       404:
 *         description: User not found
 */

export {};
