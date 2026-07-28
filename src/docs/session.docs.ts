/**
 * @swagger
 * tags:
 *   name: Sessions
 *   description: |
 *     Session APIs. The refresh token travels as an httpOnly refreshToken cookie (scoped to path /api/session), not in the request/response body - it can't be read or set by frontend JavaScript. Requests must be made with credentials included (fetch's credentials option, or axios's withCredentials flag, set to true/"include") for the cookie to be sent cross-origin.
 */

/**
 * @swagger
 * /api/session/refresh:
 *   post:
 *     summary: Refresh the access token
 *     description: Reads the refresh token from the `refreshToken` cookie (not the body). Rotates it - the old session is deleted and a new one created - and re-sets the cookie with the new value. The response body also includes both tokens for now, during the frontend's transition off body-based refresh tokens.
 *     tags:
 *       - Sessions
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *       401:
 *         description: Refresh token cookie missing, session not found, or session expired
 */

/**
 * @swagger
 * /api/session/logout:
 *   post:
 *     summary: Logout and revoke the session
 *     description: Reads the refresh token from the `refreshToken` cookie, deletes the matching Session row, and clears the cookie.
 *     tags:
 *       - Sessions
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
export {};
