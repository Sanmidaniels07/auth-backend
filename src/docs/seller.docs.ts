/**
 * @swagger
 * tags:
 *   name: Seller
 *   description: Seller onboarding and profile management
 */

/**
 * @swagger
 * /api/seller/become-seller:
 *   post:
 *     summary: Become a seller
 *     description: Creates a seller profile for the authenticated user. Requires authentication. Fails if a seller profile already exists for this user.
 *     tags:
 *       - Seller
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cacNumber:
 *                 type: string
 *                 example: RC1234567
 *     responses:
 *       201:
 *         description: Seller profile created successfully
 *       400:
 *         description: Seller profile already exists
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/seller/me:
 *   get:
 *     summary: Get the authenticated user's seller profile
 *     description: Returns the seller profile (including its store, if one exists) for the authenticated user. Requires authentication and an existing seller profile.
 *     tags:
 *       - Seller
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller profile fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Seller profile not found
 *   patch:
 *     summary: Update the authenticated user's seller profile
 *     description: Updates seller profile fields for the authenticated user. Requires authentication and an existing seller profile.
 *     tags:
 *       - Seller
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cacNumber:
 *                 type: string
 *                 example: RC7654321
 *     responses:
 *       200:
 *         description: Seller profile updated successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Seller profile not found
 */

export {};
