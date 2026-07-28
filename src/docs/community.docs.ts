/**
 * @swagger
 * tags:
 *   name: Community
 *   description: User communities/groups
 */

/**
 * @swagger
 * /api/communities:
 *   post:
 *     summary: Create a community
 *     description: Requires authentication. The creator automatically becomes an ADMIN member.
 *     tags:
 *       - Community
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       201:
 *         description: Community created successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *   get:
 *     summary: List communities
 *     description: Public endpoint, paginated, supports search by name.
 *     tags:
 *       - Community
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
 *         description: Communities fetched successfully
 */

/**
 * @swagger
 * /api/communities/trending:
 *   get:
 *     summary: Get trending communities
 *     description: Public endpoint. Ordered by member count.
 *     tags:
 *       - Community
 *     security: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Trending communities fetched successfully
 */

/**
 * @swagger
 * /api/communities/{slug}:
 *   get:
 *     summary: Get a community by slug
 *     description: Public endpoint (personalized if authenticated, includes `isMember`).
 *     tags:
 *       - Community
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Community fetched successfully
 *       404:
 *         description: Community not found
 */

/**
 * @swagger
 * /api/communities/{slug}/join:
 *   post:
 *     summary: Join a community
 *     description: Requires authentication.
 *     tags:
 *       - Community
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Joined community successfully
 *       400:
 *         description: Already a member
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Community not found
 */

/**
 * @swagger
 * /api/communities/{slug}/leave:
 *   delete:
 *     summary: Leave a community
 *     description: Requires authentication.
 *     tags:
 *       - Community
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Left community successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Not a member, or community not found
 */

export {};
