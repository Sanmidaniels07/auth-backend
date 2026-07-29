/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification APIs
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get logged in user's notifications
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 */

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags:
 *       - Notifications
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
 *         description: Notification marked as read
 */

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Requires authentication.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get per-type notification preferences
 *     description: Requires authentication. Types not explicitly set default to enabled.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *   patch:
 *     summary: Enable or disable notifications for a specific type
 *     description: Requires authentication.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - enabled
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [LIKE, COMMENT, FOLLOW, MESSAGE, ORDER, SYSTEM]
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preference updated successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/notifications/push-tokens:
 *   post:
 *     summary: Register a push notification token for this device
 *     description: Requires authentication.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *               platform:
 *                 type: string
 *     responses:
 *       201:
 *         description: Push token registered successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/notifications/push-tokens/{token}:
 *   delete:
 *     summary: Unregister a push notification token
 *     description: Requires authentication.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Push token unregistered successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

export {};