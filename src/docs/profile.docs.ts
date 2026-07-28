/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: The authenticated user's own profile
 */

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get the authenticated user's profile
 *     description: Requires authentication. Returns the full profile record plus a computed `profileCompletion` percentage (based on whether username/avatar/cover/bio are filled in).
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *   patch:
 *     summary: Update the authenticated user's profile
 *     description: Requires authentication. Username must be unique if provided.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               avatar:
 *                 type: string
 *               cover:
 *                 type: string
 *               bio:
 *                 type: string
 *               location:
 *                 type: string
 *               website:
 *                 type: string
 *               socialLinks:
 *                 type: object
 *                 properties:
 *                   twitter:
 *                     type: string
 *                   instagram:
 *                     type: string
 *                   facebook:
 *                     type: string
 *                   linkedin:
 *                     type: string
 *                   tiktok:
 *                     type: string
 *                   youtube:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Username already taken
 *       401:
 *         description: Unauthorized - no or invalid token
 */

export {};
