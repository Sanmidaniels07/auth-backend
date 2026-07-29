/**
 * @swagger
 * tags:
 *   name: Administration
 *   description: Protected APIs
 */

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get current user profile
 *     tags:
 *       - Administration
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Admin dashboard
 *     tags:
 *       - Administration
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   patch:
 *     summary: Update a user's role
 *     description: Requires authentication and ADMIN role. An admin cannot change their own role - another admin must do it, to avoid a self-lockout with no admins left.
 *     tags:
 *       - Administration
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Cannot change your own role
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: User not found
 */

export {};