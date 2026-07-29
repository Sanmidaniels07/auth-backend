/**
 * @swagger
 * tags:
 *   name: Store
 *   description: Seller store management and public store browsing
 */

/**
 * @swagger
 * /api/stores:
 *   post:
 *     summary: Create a store
 *     description: Creates a store for the authenticated seller. Requires authentication and an existing seller profile. A seller may only have one store.
 *     tags:
 *       - Store
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Daniel's Gadgets
 *               description:
 *                 type: string
 *               logo:
 *                 type: string
 *               banner:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               returnPolicy:
 *                 type: string
 *               shippingPolicy:
 *                 type: string
 *               warrantyPolicy:
 *                 type: string
 *     responses:
 *       201:
 *         description: Store created successfully
 *       400:
 *         description: Seller already has a store
 *       403:
 *         description: Not a seller
 *       401:
 *         description: Unauthorized - no or invalid token
 *   get:
 *     summary: List stores
 *     description: Returns a paginated, public list of stores. Supports search and city filters. Suspended stores (owner banned/suspended by an admin) are excluded.
 *     tags:
 *       - Store
 *     security: []
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
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stores fetched successfully
 */

/**
 * @swagger
 * /api/stores/me:
 *   get:
 *     summary: Get the authenticated seller's own store
 *     description: Requires authentication and an existing seller profile with a store.
 *     tags:
 *       - Store
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Store fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Seller profile or store not found
 */

/**
 * @swagger
 * /api/stores/{slug}/products:
 *   get:
 *     summary: List a store's published products
 *     description: Returns a paginated list of published products belonging to the store identified by slug. Public endpoint. Returns 404 if the store is suspended.
 *     tags:
 *       - Store
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
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
 *         description: Store products fetched successfully
 *       404:
 *         description: Store not found
 */

/**
 * @swagger
 * /api/stores/{slug}:
 *   get:
 *     summary: Get a public store by slug
 *     description: Returns store details, including basic seller info, shipping options, followersCount, and (if authenticated) isFollowing. Public endpoint. Returns 404 if the store is suspended (owner banned/suspended by an admin), regardless of who is asking.
 *     tags:
 *       - Store
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Store fetched successfully
 *       404:
 *         description: Store not found
 */

/**
 * @swagger
 * /api/stores/{slug}/follow:
 *   post:
 *     summary: Follow a store
 *     description: Requires authentication.
 *     tags:
 *       - Store
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Store followed successfully
 *       400:
 *         description: Already following this store
 *       404:
 *         description: Store not found
 *   delete:
 *     summary: Unfollow a store
 *     description: Requires authentication.
 *     tags:
 *       - Store
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Store unfollowed successfully
 *       404:
 *         description: Not following this store, or store not found
 */

/**
 * @swagger
 * /api/stores/{slug}/follow/status:
 *   get:
 *     summary: Check if the authenticated user follows a store
 *     description: Requires authentication.
 *     tags:
 *       - Store
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns `{ isFollowing }`
 *       404:
 *         description: Store not found
 */

/**
 * @swagger
 * /api/stores/{slug}/shipping-options:
 *   post:
 *     summary: Add a shipping option to a store
 *     description: Requires authentication and ownership of the store.
 *     tags:
 *       - Store
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
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
 *               - name
 *               - fee
 *             properties:
 *               name:
 *                 type: string
 *                 example: Express
 *               fee:
 *                 type: number
 *               etaDays:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Shipping option created successfully
 *       403:
 *         description: Not the owner of this store
 *       404:
 *         description: Store not found
 */

/**
 * @swagger
 * /api/stores/{slug}/shipping-options/{optionId}:
 *   patch:
 *     summary: Update a shipping option
 *     description: Requires authentication and ownership of the store.
 *     tags:
 *       - Store
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               fee:
 *                 type: number
 *               etaDays:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Shipping option updated successfully
 *       403:
 *         description: Not the owner of this store
 *       404:
 *         description: Shipping option or store not found
 *   delete:
 *     summary: Delete a shipping option
 *     description: Requires authentication and ownership of the store.
 *     tags:
 *       - Store
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipping option deleted successfully
 *       403:
 *         description: Not the owner of this store
 *       404:
 *         description: Shipping option or store not found
 */

/**
 * @swagger
 * /api/stores/{id}/verify:
 *   patch:
 *     summary: Set a store's verified badge
 *     description: Requires authentication. ADMIN only - not exposed on the regular store update endpoint, so sellers can't self-verify.
 *     tags:
 *       - Store
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
 *               - isVerified
 *             properties:
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Store verification status updated successfully
 *       403:
 *         description: Admin only
 *       404:
 *         description: Store not found
 */

/**
 * @swagger
 * /api/stores/{id}:
 *   patch:
 *     summary: Update a store
 *     description: Updates the store owned by the authenticated seller. Requires authentication and ownership of the store.
 *     tags:
 *       - Store
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               logo:
 *                 type: string
 *               banner:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               returnPolicy:
 *                 type: string
 *               shippingPolicy:
 *                 type: string
 *               warrantyPolicy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Store updated successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not the owner of this store
 *       404:
 *         description: Store not found
 */

export {};
