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

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users
 *     description: Requires authentication and ADMIN role. Richer than the public user list - includes email, role, status, verification state, and soft-delete state. Supports search and filtering.
 *     tags:
 *       - Administration
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Matches against name, email, or username
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, ADMIN]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, SUSPENDED, BANNED]
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 */

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   patch:
 *     summary: Suspend, ban, or reactivate a user
 *     description: Requires authentication and ADMIN role. An admin cannot change their own status - another admin must do it. Suspension/ban is indefinite until an admin sets status back to ACTIVE. Setting a non-ACTIVE status immediately revokes all of the user's sessions, so they will not be able to refresh into a new access token (an already-issued access token can still be used until it naturally expires, up to 15 minutes). A reason is required when suspending or banning.
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, SUSPENDED, BANNED]
 *               reason:
 *                 type: string
 *                 description: Required when status is SUSPENDED or BANNED
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Cannot change your own status, or missing reason
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: User not found
 */

export {};