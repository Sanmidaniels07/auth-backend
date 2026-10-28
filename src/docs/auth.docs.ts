/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication APIs
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Daniel
 *               email:
 *                 type: string
 *                 example: daniel@test.com
 *               password:
 *                 type: string
 *                 example: Password123
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1998-05-14"
 *                 description: Optional. Calendar date (YYYY-MM-DD); the user must be 13-100 years old. Used for birthday reminders to followers; the full date (year) is never shown publicly.
 *               referralCode:
 *                 type: string
 *                 example: K7Q2MZPA
 *                 description: Optional. Code from the seller share link (?ref=) the user arrived through. Links the new user to that store, which then pays 2 points less commission on their orders from it for 90 days. Unknown codes are ignored.
 *               source:
 *                 type: string
 *                 description: Optional. Where the visitor came from (GOOGLE, OTHER_SEARCH, WHATSAPP, INSTAGRAM, FACEBOOK, TIKTOK, X, SELLER_LINK, PAYMENT_LINK, OTHER_SITE, DIRECT); unknown values are ignored. Saved as signupSource for the admin overview.
 *     responses:
 *       201:
 *         description: User created successfully
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: On success, also sets an httpOnly `refreshToken` cookie (scoped to /api/session) in addition to returning both tokens in the body during the frontend's transition off body-based refresh tokens.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: The account signs in with Google and has no password yet
 */

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Continue with Google (sign up or log in)
 *     description: >
 *       Takes the ID token from Google's sign-in button and checks it with Google (signature, expiry,
 *       issued for Nestly's client, verified email). Signs in the account linked to that Google account;
 *       otherwise links it to the account with the same email (also verifying that email - if it was never
 *       verified, its password and sessions are removed, since whoever set them may not own the address);
 *       otherwise creates a verified account with the Google name and photo. Banned, suspended and deleted
 *       accounts are refused, and accounts with 2FA get the usual `requires2FA` challenge (finish with
 *       POST /api/2fa/login). Sets the refresh cookie like /login. `isNewUser` is true when an account was
 *       just created, so the website can show its welcome step.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *                 description: The Google ID token (JWT) from Google Identity Services.
 *               referralCode:
 *                 type: string
 *                 description: Seller share-link code (?ref=) they arrived through; only used when a new account is created.
 *               source:
 *                 type: string
 *                 description: where the visitor came from - one of GOOGLE, OTHER_SEARCH, WHATSAPP, INSTAGRAM, FACEBOOK, TIKTOK, X, SELLER_LINK, PAYMENT_LINK, OTHER_SITE, DIRECT (unknown values are ignored). Saved as the new account's signupSource for the admin overview only.
 *     responses:
 *       200:
 *         description: Logged in (or 2FA required)
 *       201:
 *         description: New account created and logged in
 *       401:
 *         description: Invalid Google token, unverified Google email, or deleted account
 *       403:
 *         description: Account banned or suspended
 */

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset token generated
 */

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 */


export {};