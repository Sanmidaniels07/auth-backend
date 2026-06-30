/**
 * @swagger
 * tags:
 *   name: Sessions
 *   description: Session APIs
 */

/**
 * @swagger
 * /api/session/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags:
 *       - Sessions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *       401:
 *         description: Session expired or invalid
 */

/**
 * @swagger
 * /api/session/logout:
 *   post:
 *     summary: Logout user and revoke session
 *     tags:
 *       - Sessions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
export {};