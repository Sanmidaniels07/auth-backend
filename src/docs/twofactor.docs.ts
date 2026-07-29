/**
 * @swagger
 * tags:
 *   name: Two-Factor Auth
 *   description: TOTP-based two-factor authentication setup and login challenge
 */

/**
 * @swagger
 * /api/2fa/setup:
 *   post:
 *     summary: Start 2FA setup
 *     description: Requires authentication. Generates a TOTP secret and returns a QR code data URL to scan with an authenticator app. 2FA is not enabled until verified via /api/2fa/verify.
 *     tags:
 *       - Two-Factor Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Setup data generated successfully, returns secret and qrCode fields
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/2fa/verify:
 *   post:
 *     summary: Verify setup and enable 2FA
 *     description: Requires authentication. Confirms the 6-digit code from the authenticator app matches the pending secret, then enables 2FA on the account.
 *     tags:
 *       - Two-Factor Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code
 *     responses:
 *       200:
 *         description: Two-factor authentication enabled successfully
 *       400:
 *         description: Invalid or expired code
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/2fa/disable:
 *   post:
 *     summary: Disable 2FA
 *     description: Requires authentication and a valid current TOTP code.
 *     tags:
 *       - Two-Factor Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code
 *     responses:
 *       200:
 *         description: Two-factor authentication disabled successfully
 *       400:
 *         description: Invalid code
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/2fa/login:
 *   post:
 *     summary: Complete login for an account with 2FA enabled
 *     description: Second step of login. Called with the short-lived twoFactorToken returned from POST /api/auth/login when the account has 2FA enabled, plus the current TOTP code. No bearer token is required for this step.
 *     tags:
 *       - Two-Factor Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - twoFactorToken
 *               - token
 *             properties:
 *               twoFactorToken:
 *                 type: string
 *                 description: Short-lived token returned by the first login step
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code
 *     responses:
 *       200:
 *         description: Login completed successfully, returns accessToken, user, and sets refresh token cookie
 *       400:
 *         description: Invalid or expired code, or expired 2FA token
 */

export {};
