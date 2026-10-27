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
 *     description: Requires authentication and confirmation - the password, or for Google-only accounts (no password) a fresh Google ID token for the same Google account. Marks the account deleted, frees its email, username and Google link, and invalidates all sessions.
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
 *             properties:
 *               password:
 *                 type: string
 *                 description: Required when the account has a password.
 *               googleCredential:
 *                 type: string
 *                 description: Google ID token; used when the account has no password.
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Incorrect password, or not the linked Google account
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
