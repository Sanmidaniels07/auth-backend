/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Blog Post APIs
 */

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a post
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Post created
 */

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Posts fetched successfully
 */

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Get single post
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Post fetched successfully
 */

/**
 * @swagger
 * /api/posts/{id}:
 *   patch:
 *     summary: Update a post
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /api/posts/{id}:
 *   patch:
 *     summary: Update a post
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /api/posts/restore/{id}:
 *   patch:
 *     summary: Restore deleted post
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /api/posts/deleted:
 *   get:
 *     summary: Get deleted posts
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 */

export {};