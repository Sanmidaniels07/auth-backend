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
 *     description: Requires authentication and ADMIN role. An admin cannot change their own status - another admin must do it. Suspension/ban is indefinite until an admin sets status back to ACTIVE. Setting a non-ACTIVE status immediately revokes all of the user's sessions, so they will not be able to refresh into a new access token (an already-issued access token can still be used until it naturally expires, up to 15 minutes). A reason is required when suspending or banning. If the user is a seller, their store is automatically suspended (hidden from marketplace browsing and search) along with them, and un-suspended when they're set back to ACTIVE.
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

/**
 * @swagger
 * /api/admin/sellers:
 *   get:
 *     summary: List seller applications
 *     description: Requires authentication and ADMIN role. Defaults to all statuses; filter by status to see only pending applications.
 *     tags:
 *       - Administration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sellers fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 */

/**
 * @swagger
 * /api/admin/sellers/{id}/status:
 *   patch:
 *     summary: Approve or reject a seller application
 *     description: Requires authentication and ADMIN role. The id is the SellerProfile id, not the user id (use GET /api/admin/sellers to look it up). A newly-created seller profile starts PENDING and cannot create a store or products until approved - the same createStoreService, createProductService, and every other seller-owned action check this status. A reason is required when rejecting. The seller is notified either way. Rejecting starts a 3-day cooldown (tracked via statusUpdatedAt) before the seller can reapply via POST /api/seller/become-seller - see that endpoint's docs for details.
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
 *                 enum: [APPROVED, REJECTED]
 *               reason:
 *                 type: string
 *                 description: Required when status is REJECTED
 *     responses:
 *       200:
 *         description: Seller status updated successfully
 *       400:
 *         description: Missing reason when rejecting
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: Seller profile not found
 */

/**
 * @swagger
 * /api/admin/sellers/{id}/verify:
 *   patch:
 *     summary: Mark a seller's business as CAC-verified (manual check)
 *     description: Requires authentication and ADMIN role. Used after an admin has looked the seller's CAC number up on the CAC public search (search.cac.gov.ng) and confirmed the business exists, is active and matches the store. Sets SellerProfile.isVerified and the store's public isVerified badge together, and notifies the seller when the value changes. Verifying requires the seller to have supplied a CAC number. Changing the CAC number later (PATCH /api/seller, or reapplying) automatically removes the verification.
 *     tags:
 *       - Administration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: SellerProfile id
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isVerified
 *             properties:
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Verification updated
 *       400:
 *         description: Seller has no CAC number to verify
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: Seller profile not found
 */

/**
 * @swagger
 * /api/admin/products:
 *   get:
 *     summary: List products for admins
 *     description: Requires ADMIN. Products in any status (including drafts and archived), most recently edited first, with `_count.revisions` (saved edits) and `_count.reviews`. `search` matches title, SKU or store name.
 *     tags:
 *       - Administration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Products fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 */

/**
 * @swagger
 * /api/admin/products/{id}/history:
 *   get:
 *     summary: A product's edit history
 *     description: |
 *       Requires ADMIN. Every saved edit to the product, newest first:
 *       - `changes` - [{ field, from, to }] with readable values (e.g. Price "₦2,000" → "₦2,500"). `Photos` holds lists of image URLs, cover first.
 *       - `editedBy` - who saved it (the seller).
 *       - `reviewsReset` - this edit turned the listing into a different product (new category or mostly different title), so earlier reviews are now labelled as for an earlier version.
 *       Stock changes caused by orders are not logged - only edits.
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product history fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /api/admin/products/{id}/featured:
 *   patch:
 *     summary: Feature or unfeature a product
 *     description: Admin only. Featured products appear in the marketplace's featured sections. Sellers can't feature their own products.
 *     tags:
 *       - Admin
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
 *             required: [isFeatured]
 *             properties:
 *               isFeatured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product featured / no longer featured
 *       403:
 *         description: Not an admin
 *       404:
 *         description: Product not found
 */

export {};
