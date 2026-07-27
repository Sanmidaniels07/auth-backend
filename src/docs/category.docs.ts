/**
 * @swagger
 * tags:
 *   name: Category
 *   description: Product category management and browsing
 */

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category
 *     description: Creates a new product category. Requires authentication and the ADMIN role.
 *     tags:
 *       - Category
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
 *                 example: Electronics
 *               icon:
 *                 type: string
 *               isFeatured:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Category created successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 *   get:
 *     summary: List all categories
 *     description: Returns every category. Public endpoint.
 *     tags:
 *       - Category
 *     security: []
 *     responses:
 *       200:
 *         description: Categories fetched successfully
 */

/**
 * @swagger
 * /api/categories/featured:
 *   get:
 *     summary: Get featured categories
 *     description: Returns categories marked as featured (`isFeatured = true`). Public endpoint.
 *     tags:
 *       - Category
 *     security: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 8
 *     responses:
 *       200:
 *         description: Featured categories fetched successfully
 */

/**
 * @swagger
 * /api/categories/popular:
 *   get:
 *     summary: Get popular categories
 *     description: Returns categories ordered by number of products, as a proxy for popularity. Public endpoint.
 *     tags:
 *       - Category
 *     security: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 8
 *     responses:
 *       200:
 *         description: Popular categories fetched successfully
 */

/**
 * @swagger
 * /api/categories/{slug}:
 *   get:
 *     summary: Get a category by slug
 *     description: Public endpoint.
 *     tags:
 *       - Category
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category fetched successfully
 *       404:
 *         description: Category not found
 */

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     summary: Update a category
 *     description: Requires authentication and the ADMIN role.
 *     tags:
 *       - Category
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
 *               icon:
 *                 type: string
 *               isFeatured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: Category not found
 *   delete:
 *     summary: Delete a category
 *     description: Requires authentication and the ADMIN role. Fails if the category still has products.
 *     tags:
 *       - Category
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
 *         description: Category deleted successfully
 *       400:
 *         description: Category still has products
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: Category not found
 */

export {};
