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
 *               cacCompanyType:
 *                 type: string
 *                 enum: [BUSINESS_NAME, COMPANY, INCORPORATED_TRUSTEES, LIMITED_PARTNERSHIP, LIMITED_LIABILITY_PARTNERSHIP]
 *                 description: Which CAC register the number is on. Optional - inferred from the number's prefix (BN, RC, IT, LP, LLP), otherwise COMPANY.
 *                 example: COMPANY
 *     responses:
 *       201:
 *         description: Seller profile created successfully. When automatic CAC checks are on, the response already carries the lookup result (cacCheckResult, cacCheckedName, cacCheckedStatus, cacCheckedAt).
 *       400:
 *         description: Seller profile already exists (PENDING or APPROVED), or the CAC number / business type is invalid
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
 *     description: Updates seller profile fields for the authenticated user. Requires authentication and an existing seller profile. `cacNumber` can be added or changed at any time (letters and numbers, stored uppercase without spaces; "" removes it). A new or changed number (or `cacCompanyType`) clears the business verification and the store's verified badge, then the number is looked up on the CAC register (Dojah) before the response returns. An active business whose registered name matches the store name is verified automatically (seller notified; `cacCheckResult` VERIFIED). Otherwise `cacCheckResult` is AWAITING_STORE (no store yet - compared when the store is created), NAME_MISMATCH, INACTIVE, NOT_FOUND or FAILED, and admins are notified with what the register said (not for AWAITING_STORE). Renaming the store compares the name again without a new lookup. Without Dojah keys, admins are notified to check by hand as before. Approved sellers without a CAC number (with or without a store) get reminders in-app and by email: 3 days after approval, then every 14 days until they add one.
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
 *               cacCompanyType:
 *                 type: string
 *                 enum: [BUSINESS_NAME, COMPANY, INCORPORATED_TRUSTEES, LIMITED_PARTNERSHIP, LIMITED_LIABILITY_PARTNERSHIP]
 *                 description: Which CAC register the number is on. Optional - inferred from the number's prefix (BN, RC, IT, LP, LLP), otherwise COMPANY.
 *                 example: BUSINESS_NAME
 *     responses:
 *       200:
 *         description: Seller profile updated successfully, with the CAC check result
 *       400:
 *         description: Invalid CAC number or business type
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Seller profile not found
 */

/**
 * @swagger
 * /api/seller/me/readiness:
 *   get:
 *     summary: What's left before buyers can order from this seller
 *     description: Requires authentication and a seller profile. For approved sellers, `missing` lists the steps still to do - STORE (set up the store), PAYOUT (payout bank account), DELIVERY (at least one active delivery zone or pickup), PRODUCT (at least one published product) - each with `title`, `why` and `path` (where to do it). `ready` is true when nothing is missing. Approved sellers who aren't ready also get reminders in-app and by email: 2 days after approval, then weekly until done.
 *     tags:
 *       - Seller
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller readiness fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Seller profile not found
 */

export {};
