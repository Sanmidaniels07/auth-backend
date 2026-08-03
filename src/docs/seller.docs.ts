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
 *     description: Creates a seller profile for the authenticated user, with status PENDING. Requires authentication. An admin must approve the application (PATCH /api/admin/sellers/{id}/status) before this user can create a store or products. If a profile already exists and is PENDING or APPROVED, this fails. If it was REJECTED, this resets it to PENDING and lets the user reapply, but only once 3 days have passed since the rejection - check GET /api/seller/me's canReapply and reapplyEligibleAt fields before showing a reapply button, since calling this too early returns a 403.
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
 *         description: Seller profile already exists (PENDING or APPROVED)
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Previously rejected and still within the 3-day reapply cooldown
 */

/**
 * @swagger
 * /api/seller/me:
 *   get:
 *     summary: Get the authenticated user's seller profile
 *     description: Returns the seller profile (including its store, if one exists) for the authenticated user. Requires authentication and an existing seller profile. Check the status field (PENDING, APPROVED, REJECTED) and statusReason to see approval state. When status is REJECTED, also returns reapplyEligibleAt (ISO datetime the 3-day cooldown ends) and canReapply (boolean) - use these to drive a reapply countdown on the frontend instead of guessing from statusUpdatedAt yourself.
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
