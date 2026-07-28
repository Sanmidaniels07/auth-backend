/**
 * @swagger
 * tags:
 *   name: Report
 *   description: Reporting listings/users/posts/stores for moderation
 */

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Report a post, user, product, or store
 *     description: Requires authentication. Validates the target actually exists.
 *     tags:
 *       - Report
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetType
 *               - targetId
 *               - reason
 *             properties:
 *               targetType:
 *                 type: string
 *                 enum: [POST, USER, PRODUCT, STORE]
 *               targetId:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Report submitted successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Target not found
 *   get:
 *     summary: List reports
 *     description: Requires authentication. ADMIN only. This is the moderation queue. Paginated, filterable by status and targetType.
 *     tags:
 *       - Report
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
 *           enum: [PENDING, REVIEWED, DISMISSED, ACTION_TAKEN]
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [POST, USER, PRODUCT, STORE]
 *     responses:
 *       200:
 *         description: Reports fetched successfully
 *       403:
 *         description: Admin only
 */

/**
 * @swagger
 * /api/reports/{id}:
 *   patch:
 *     summary: Update a report's status
 *     description: Requires authentication. ADMIN only. Records the reviewing admin and timestamp.
 *     tags:
 *       - Report
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
 *                 enum: [PENDING, REVIEWED, DISMISSED, ACTION_TAKEN]
 *     responses:
 *       200:
 *         description: Report status updated successfully
 *       403:
 *         description: Admin only
 *       404:
 *         description: Report not found
 */

export {};
