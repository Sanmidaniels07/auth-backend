/**
 * @swagger
 * tags:
 *   name: Product
 *   description: Product management, browsing, search and discovery
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product
 *     description: Creates a product under the authenticated seller's store. Requires authentication, an APPROVED seller profile, and an existing store. Accepts nested images, specifications, and optional options/variations (e.g. Size x Colour, each combination with its own stock and optional price).
 *     tags:
 *       - Product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoryId
 *               - title
 *               - description
 *               - sku
 *               - price
 *               - stock
 *             properties:
 *               categoryId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               sku:
 *                 type: string
 *               brand:
 *                 type: string
 *               condition:
 *                 type: string
 *                 enum: [NEW, USED, REFURBISHED]
 *               deliveryVehicle:
 *                 type: string
 *                 enum: [BIKE, CAR, TRUCK]
 *                 default: BIKE
 *                 description: The smallest vehicle that can deliver this product. At checkout buyers only see the store's delivery zones with a vehicle at least this big (plus pickup and zones with no vehicle set).
 *               price:
 *                 type: number
 *               originalPrice:
 *                 type: number
 *               stock:
 *                 type: integer
 *               isFeatured:
 *                 type: boolean
 *               highlights:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     isPrimary:
 *                       type: boolean
 *               specifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     value:
 *                       type: string
 *               options:
 *                 type: array
 *                 maxItems: 2
 *                 description: Optional choices buyers make, e.g. Size and Colour (at most 2). Send together with variations; [] removes options. Leave both out to keep the product's options as they are.
 *                 items:
 *                   type: object
 *                   required: [name, values]
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Size
 *                     values:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [Small, Medium, Large]
 *               variations:
 *                 type: array
 *                 description: One per combination of option values. option2 only when there are 2 options. price null/omitted uses the product price. isActive false hides a combination from buyers. With options, the product's stock becomes the total of active combinations. Combinations removed here are deleted, or archived if they already have orders.
 *                 items:
 *                   type: object
 *                   required: [option1, stock]
 *                   properties:
 *                     option1:
 *                       type: string
 *                       example: Large
 *                     option2:
 *                       type: string
 *                       example: Vanilla
 *                     price:
 *                       type: number
 *                       nullable: true
 *                     stock:
 *                       type: integer
 *                     isActive:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: SKU already in use
 *       403:
 *         description: Seller has no store, or seller application is pending/rejected
 *       404:
 *         description: Category not found
 *   get:
 *     summary: List products
 *     description: Public, paginated list of published products. Supports search, category, price range, condition, brand and sort.
 *     tags:
 *       - Product
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
 *         name: category
 *         schema:
 *           type: string
 *         description: Category slug
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: condition
 *         schema:
 *           type: string
 *           enum: [NEW, USED, REFURBISHED]
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         description: Store's state, e.g. Lagos or Abuja (any common spelling - "Lagos State", "FCT")
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, price_asc, price_desc]
 *     responses:
 *       200:
 *         description: Products fetched successfully
 */

/**
 * @swagger
 * /api/products/featured:
 *   get:
 *     summary: Get featured products
 *     description: Returns published products marked as featured (`isFeatured = true`). Public endpoint.
 *     tags:
 *       - Product
 *     security: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 8
 *     responses:
 *       200:
 *         description: Featured products fetched successfully
 */

/**
 * @swagger
 * /api/products/nearby:
 *   get:
 *     summary: Get nearby products
 *     description: Returns published products whose store matches the given city and/or state (text match, not geo-distance). Requires at least one of `city` or `state`. Public endpoint.
 *     tags:
 *       - Product
 *     security: []
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
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
 *         description: Nearby products fetched successfully
 *       400:
 *         description: Neither city nor state provided
 */

/**
 * @swagger
 * /api/products/me:
 *   get:
 *     summary: Get the authenticated seller's own products
 *     description: Returns all products belonging to the authenticated seller's store, in any status (draft, published, out of stock, archived). Requires authentication and an existing store.
 *     tags:
 *       - Product
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, OUT_OF_STOCK, ARCHIVED]
 *     responses:
 *       200:
 *         description: Your products fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

/**
 * @swagger
 * /api/products/me/{id}:
 *   get:
 *     summary: Get one of the authenticated seller's own products by id
 *     description: Returns a product owned by the authenticated seller regardless of status, for editing. Requires authentication and ownership.
 *     tags:
 *       - Product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /api/products/me/export:
 *   get:
 *     summary: Export the authenticated seller's products as CSV
 *     description: Requires authentication and an existing store. Returns a text/csv attachment covering every product regardless of status.
 *     tags:
 *       - Product
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file streamed successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

/**
 * @swagger
 * /api/products/me/bulk-status:
 *   patch:
 *     summary: Bulk update product status
 *     description: Requires authentication. Only updates products owned by the authenticated seller's store; ids not owned by the seller are silently skipped.
 *     tags:
 *       - Product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productIds
 *               - status
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, OUT_OF_STOCK, ARCHIVED]
 *     responses:
 *       200:
 *         description: Products updated successfully, returns updatedCount
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

/**
 * @swagger
 * /api/products/me/bulk-delete:
 *   post:
 *     summary: Bulk archive (soft-delete) products
 *     description: Requires authentication. Only archives products owned by the authenticated seller's store; ids not owned by the seller are silently skipped.
 *     tags:
 *       - Product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productIds
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Products archived successfully, returns archivedCount
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

/**
 * @swagger
 * /api/products/{id}/related:
 *   get:
 *     summary: Get related products
 *     description: Returns other published products in the same category as the given product. Public endpoint.
 *     tags:
 *       - Product
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 8
 *     responses:
 *       200:
 *         description: Related products fetched successfully
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a published product by id
 *     description: Public endpoint. Only returns products with status PUBLISHED. Products of a suspended store return 404, except to admins (send their token), who can still review them - store.isSuspended tells them.
 *     tags:
 *       - Product
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product fetched successfully
 *       404:
 *         description: Product not found
 *   patch:
 *     summary: Update a product
 *     description: Updates a product owned by the authenticated seller. Requires authentication and ownership. Also used to manage inventory (`stock`) and publishing (`status`) - there are no separate endpoints for these. Providing `images` or `specifications` replaces the existing set entirely; `options` + `variations` (sent together) replace the product's options. While a product has options, a plain `stock` value is ignored - stock is the total of its active combinations. Every save that changes something is logged for admins (see GET /api/admin/products/{id}/history); a new category or a mostly different title also sets `reviewsResetAt`, marking earlier reviews as for an earlier version.
 *     tags:
 *       - Product
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
 *               categoryId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               sku:
 *                 type: string
 *               brand:
 *                 type: string
 *               condition:
 *                 type: string
 *                 enum: [NEW, USED, REFURBISHED]
 *               deliveryVehicle:
 *                 type: string
 *                 enum: [BIKE, CAR, TRUCK]
 *                 default: BIKE
 *                 description: The smallest vehicle that can deliver this product. At checkout buyers only see the store's delivery zones with a vehicle at least this big (plus pickup and zones with no vehicle set).
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, OUT_OF_STOCK, ARCHIVED]
 *               price:
 *                 type: number
 *               originalPrice:
 *                 type: number
 *               stock:
 *                 type: integer
 *               isFeatured:
 *                 type: boolean
 *               highlights:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *               specifications:
 *                 type: array
 *                 items:
 *                   type: object
 *               options:
 *                 type: array
 *                 maxItems: 2
 *                 description: Optional choices buyers make, e.g. Size and Colour (at most 2). Send together with variations; [] removes options. Leave both out to keep the product's options as they are.
 *                 items:
 *                   type: object
 *                   required: [name, values]
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Size
 *                     values:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [Small, Medium, Large]
 *               variations:
 *                 type: array
 *                 description: One per combination of option values. option2 only when there are 2 options. price null/omitted uses the product price. isActive false hides a combination from buyers. With options, the product's stock becomes the total of active combinations. Combinations removed here are deleted, or archived if they already have orders.
 *                 items:
 *                   type: object
 *                   required: [option1, stock]
 *                   properties:
 *                     option1:
 *                       type: string
 *                       example: Large
 *                     option2:
 *                       type: string
 *                       example: Vanilla
 *                     price:
 *                       type: number
 *                       nullable: true
 *                     stock:
 *                       type: integer
 *                     isActive:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: SKU already in use
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not the owner of this product
 *       404:
 *         description: Product or category not found
 *   delete:
 *     summary: Archive a product
 *     description: Soft-deletes a product owned by the authenticated seller by setting its status to ARCHIVED (products are never hard-deleted, since past orders may reference them). Requires authentication and ownership.
 *     tags:
 *       - Product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product archived successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not the owner of this product
 *       404:
 *         description: Product not found
 */

export {};
