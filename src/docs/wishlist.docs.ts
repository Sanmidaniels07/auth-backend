/**
 * @swagger
 * tags:
 *   name: Wishlist
 *   description: Save and manage a user's saved products
 */

/**
 * @swagger
 * /api/wishlist:
 *   post:
 *     summary: Add a product to the wishlist
 *     description: Requires authentication. Fails if the product doesn't exist or is already in the wishlist.
 *     tags:
 *       - Wishlist
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product added to wishlist
 *       400:
 *         description: Product already in wishlist
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Product not found
 *   get:
 *     summary: Get the authenticated user's wishlist
 *     description: Requires authentication. Returns saved products with basic product/store details, paginated.
 *     tags:
 *       - Wishlist
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
 *     responses:
 *       200:
 *         description: Wishlist fetched successfully - includes visibility (PRIVATE, FOLLOWERS or EVERYONE)
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/wishlist/{productId}:
 *   delete:
 *     summary: Remove a product from the wishlist
 *     description: Requires authentication.
 *     tags:
 *       - Wishlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product removed from wishlist
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Product not found in wishlist
 */

/**
 * @swagger
 * /api/wishlist/visibility:
 *   patch:
 *     summary: Choose who can see your wishlist
 *     description: >
 *       Requires authentication. PRIVATE (default) - only you; FOLLOWERS - people
 *       who follow you (they get gift ideas in birthday reminders); EVERYONE -
 *       anyone, including people who are not signed in. People you have blocked,
 *       or who blocked you, never see it.
 *     tags:
 *       - Wishlist
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visibility]
 *             properties:
 *               visibility:
 *                 type: string
 *                 enum: [PRIVATE, FOLLOWERS, EVERYONE]
 *           example:
 *             visibility: FOLLOWERS
 *     responses:
 *       200:
 *         description: Wishlist visibility updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Wishlist visibility updated
 *               data: { wishlistVisibility: FOLLOWERS }
 *       400:
 *         description: Validation error - visibility must be PRIVATE, FOLLOWERS or EVERYONE
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/users/{identifier}/wishlist:
 *   get:
 *     summary: See someone else’s wishlist (gift ideas)
 *     description: >
 *       Optional authentication. Returned only when the owner shares it with the
 *       viewer (FOLLOWERS - the viewer follows them; EVERYONE - anyone). Other
 *       people only see items that can still be bought from an active store.
 *     tags:
 *       - Wishlist
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         description: User id or username
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
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Wishlist fetched successfully (owner, visibility, items, paging)
 *       403:
 *         description: The wishlist is private, or only for followers ("Follow Ada to see their wishlist.")
 *       404:
 *         description: User not found
 */

export {};
