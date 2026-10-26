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
 *     description: Creates a store for the authenticated seller. Requires authentication and a seller profile with status APPROVED (see POST /api/seller/become-seller and the admin approval endpoint). A seller may only have one store.
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
 *         description: Seller application is still pending or was rejected
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Seller profile not found
 *   get:
 *     summary: List stores
 *     description: Returns a paginated, public list of stores. Supports search and city filters. Suspended stores (owner banned/suspended by an admin) are excluded. Only public store fields are returned (never payout bank details or the Paystack subaccount code), plus `productCount` (published products), `followersCount` and up to 3 `previewProducts`.
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
 *       - in: query
 *         name: sort
 *         description: "`newest` (default) or `trending` - stores with at least one published product, ranked by store views, then followers."
 *         schema:
 *           type: string
 *           enum: [newest, trending]
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
 *     description: Returns a paginated list of published products belonging to the store identified by slug. Public endpoint. Returns 404 if the store is suspended, except to admins (send their token).
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
 *     description: Returns store details, including basic seller info, shipping options, followersCount, and (if authenticated) isFollowing. Public endpoint. Returns 404 if the store is suspended (owner banned/suspended by an admin) - except to admins (send their token), who can still review it; the response then has isSuspended true. Public payout details are never included.
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
 *     summary: Add a delivery zone to a store
 *     description: |
 *       Requires authentication, an approved seller account and ownership of the store.
 *       A zone is a price for a group of areas (e.g. "Amuwo Odofin / Festac / Ago" for 2,500).
 *       Give either a `name` or at least one area; the name defaults to the areas joined with " / ".
 *       A zone with no areas applies to any buyer (e.g. "Pickup" or a flat nationwide rate).
 *       Areas are trimmed and de-duplicated; `state` is stored under its official name when recognised.
 *       Suggested areas and zones come from GET /api/locations/states/{state}. A store can have up to 100 zones.
 *
 *       **Pickup:** send `type: PICKUP` to let buyers collect from the seller. Pickup is always free (`fee` is forced to 0)
 *       and covers no areas; the name defaults to "Pick up from seller" and `pickupAddress` defaults to the store's address.
 *       Orders snapshot the pickup address, and the buyer is told "Ready for pickup" when the seller marks the item shipped.
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
 *               - fee
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *               fee:
 *                 type: number
 *                 minimum: 0
 *               eta:
 *                 type: string
 *                 maxLength: 50
 *               areas:
 *                 type: array
 *                 maxItems: 40
 *                 items:
 *                   type: string
 *               state:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [DELIVERY, PICKUP]
 *                 default: DELIVERY
 *               pickupAddress:
 *                 type: string
 *                 maxLength: 300
 *                 description: Pickup only - where buyers collect
 *               vehicle:
 *                 type: string
 *                 enum: [BIKE, CAR, TRUCK]
 *                 description: Delivery only - what this price is for (dispatch bike, car or truck). Buyers only see zones whose vehicle can carry everything they're buying from the store (bigger carries smaller). Omitted = not specified, offered for every product. The same areas can be priced once per vehicle.
 *           example:
 *             fee: 2500
 *             eta: "Same day"
 *             state: "Lagos"
 *             areas: ["Amuwo Odofin", "Festac", "Ago", "Okota", "Mile 2"]
 *     responses:
 *       201:
 *         description: Shipping option created successfully
 *       400:
 *         description: Validation failed (no name or areas, negative fee) or the store already has 100 zones
 *       403:
 *         description: Not the owner of this store
 *       404:
 *         description: Store not found
 */

/**
 * @swagger
 * /api/stores/{slug}/shipping-options/bulk:
 *   post:
 *     summary: Add several delivery zones at once
 *     description: Same rules as adding one zone, for up to 50 zones in a request - used when a seller prices their state's suggested zones in one go. Either all zones are created or none.
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
 *               - options
 *             properties:
 *               options:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *           example:
 *             options:
 *               - { fee: 2500, state: "Lagos", areas: ["Amuwo Odofin", "Festac", "Ago", "Okota", "Mile 2"] }
 *               - { fee: 3500, state: "Lagos", areas: ["Satellite Town", "Suru-Alaba", "Mazamaza"] }
 *     responses:
 *       201:
 *         description: Shipping options created successfully - returns the created zones
 *       400:
 *         description: Validation failed or the store would exceed 100 zones
 *       403:
 *         description: Not the owner of this store
 *       404:
 *         description: Store not found
 */

/**
 * @swagger
 * /api/stores/{slug}/shipping-options/{optionId}:
 *   patch:
 *     summary: Edit, archive or restore a delivery zone
 *     description: Requires authentication and ownership of the store. Send only the fields to change. `isArchived` true hides the zone from buyers (it stays in the seller's list and can be restored with false). `eta` null clears the delivery time. Changing `areas` without a `name` regenerates the name from the areas. Past orders keep their own copy of the zone, so edits never change them.
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
 *               eta:
 *                 type: string
 *                 nullable: true
 *               areas:
 *                 type: array
 *                 items:
 *                   type: string
 *               state:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [DELIVERY, PICKUP]
 *               pickupAddress:
 *                 type: string
 *                 nullable: true
 *                 description: Pickup only; null falls back to the store's address
 *               vehicle:
 *                 type: string
 *                 enum: [BIKE, CAR, TRUCK]
 *                 nullable: true
 *                 description: Delivery only; null = not specified (offered for every product). Cleared for pickup.
 *               isArchived:
 *                 type: boolean
 *           example:
 *             fee: 3000
 *             isArchived: false
 *     responses:
 *       200:
 *         description: Shipping option updated successfully
 *       403:
 *         description: Not the owner of this store
 *       404:
 *         description: Shipping option or store not found
 *   delete:
 *     summary: Delete a delivery zone
 *     description: Requires authentication and ownership of the store. Permanent - use PATCH with isArchived true to hide a zone but keep it. Past orders are unaffected (they keep their own copy).
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
