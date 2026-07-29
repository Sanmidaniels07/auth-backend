/**
 * @swagger
 * tags:
 *   name: Account
 *   description: Account security - password changes, account deletion, active session management
 */

/**
 * @swagger
 * /api/account/password:
 *   patch:
 *     summary: Change password while logged in
 *     description: Requires authentication. Invalidates all other sessions on success.
 *     tags:
 *       - Account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password is incorrect
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/account:
 *   delete:
 *     summary: Delete (soft-delete) the authenticated user's account
 *     description: Requires authentication and password confirmation. Marks the account deleted and invalidates all sessions.
 *     tags:
 *       - Account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Incorrect password
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/account/sessions:
 *   get:
 *     summary: List active sessions for the authenticated user
 *     description: Requires authentication. Marks the session used to make this request as current.
 *     tags:
 *       - Account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/account/sessions/others:
 *   delete:
 *     summary: Revoke all sessions except the current one
 *     description: Requires authentication. Useful for a "log out other devices" action.
 *     tags:
 *       - Account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Other sessions revoked successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/account/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session by id
 *     description: Requires authentication. The session must belong to the requesting user.
 *     tags:
 *       - Account
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
 *         description: Session revoked successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Session not found
 */

export {};
