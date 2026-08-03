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
 *     description: Requires authentication. A post needs at least one of `content` or `media` - text-only, image/video-only, or both are all valid; `title` is always optional. Hashtags (#like-this) in `content` are extracted and tracked automatically. Media must be uploaded first via POST /api/uploads to get the URLs to pass here.
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
 *               media:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [IMAGE, VIDEO]
 *     responses:
 *       201:
 *         description: Post created
 *       400:
 *         description: Post has neither content nor media
 *       401:
 *         description: Unauthorized - no or invalid token
 *   get:
 *     summary: Get all posts
 *     description: Public endpoint (personalized if authenticated - includes `likedByMe` per post). Paginated. Each post includes `likeCount` and `hashtags`.
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
 *       - in: query
 *         name: authorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Posts fetched successfully
 */

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Get single post
 *     description: Public endpoint (personalized if authenticated).
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post fetched successfully
 *       404:
 *         description: Post not found
 *   patch:
 *     summary: Update a post
 *     description: Requires authentication and authorship. Providing `media` replaces the existing set entirely. Re-extracts hashtags if `content` changes. The resulting post must still end up with at least content or media - e.g. clearing `content` on a post with no media is rejected.
 *     tags:
 *       - Posts
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
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               media:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [IMAGE, VIDEO]
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       400:
 *         description: Update would leave the post with neither content nor media
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not the author of this post
 *       404:
 *         description: Post not found
 *   delete:
 *     summary: Delete a post
 *     description: Requires authentication and authorship. Soft delete only.
 *     tags:
 *       - Posts
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
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not the author of this post
 *       404:
 *         description: Post not found
 */

/**
 * @swagger
 * /api/posts/restore/{id}:
 *   patch:
 *     summary: Restore a soft-deleted post
 *     description: Requires authentication. ADMIN only.
 *     tags:
 *       - Posts
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
 *         description: Post restored successfully
 *       403:
 *         description: Admin only
 */

/**
 * @swagger
 * /api/posts/deleted:
 *   get:
 *     summary: Get soft-deleted posts
 *     description: Requires authentication. ADMIN only.
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deleted posts fetched successfully
 *       403:
 *         description: Admin only
 */

export {};
