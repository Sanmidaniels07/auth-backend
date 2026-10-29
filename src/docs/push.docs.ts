/**
 * @swagger
 * tags:
 *   name: Push
 *   description: >
 *     Web Push - notifications on a phone or computer, even when Nestly isn't open. Every in-app notification
 *     (messages, likes, comments, follows, orders, shopping alerts, reminders, admin alerts) is also pushed
 *     to all of the user's subscribed devices (whether or not Nestly is open), respecting their
 *     per-type notification preferences. Each push also carries the notification type (for its buttons), the unread count (app icon badge) and a signed readToken for POST /api/push/read. Tapping one opens /notifications/open?id&type&target on the website.
 *     Needs VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (/ VAPID_SUBJECT) in the environment; without them pushes are skipped.
 */

/**
 * @swagger
 * /api/push/config:
 *   get:
 *     summary: The VAPID public key browsers subscribe with
 *     description: Public. `publicKey` is null when push isn't configured on this server.
 *     tags:
 *       - Push
 *     responses:
 *       200:
 *         description: Push config fetched successfully
 */

/**
 * @swagger
 * /api/push/subscriptions:
 *   post:
 *     summary: Turn on notifications for this device
 *     description: >
 *       Saves the browser's PushSubscription (subscription.toJSON()) for the signed-in user. If the device was
 *       subscribed as someone else, it moves to this user. Only real browser push services are accepted as
 *       `endpoint` (Google, Mozilla, Apple, Microsoft) - 400 otherwise.
 *     tags:
 *       - Push
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endpoint, keys]
 *             properties:
 *               endpoint:
 *                 type: string
 *               keys:
 *                 type: object
 *                 required: [p256dh, auth]
 *                 properties:
 *                   p256dh:
 *                     type: string
 *                   auth:
 *                     type: string
 *     responses:
 *       201:
 *         description: Notifications turned on for this device
 *       400:
 *         description: Not a browser push address
 *   delete:
 *     summary: Turn off notifications for this device (also called on logout)
 *     tags:
 *       - Push
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endpoint]
 *             properties:
 *               endpoint:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notifications turned off for this device
 */

/**
 * @swagger
 * /api/push/read:
 *   post:
 *     summary: Mark a notification read from the alert's "Mark as read" button
 *     description: >-
 *       Called by the website's service worker, which has no sign-in. Each push carries the
 *       notification id and a signed readToken; a message alert marks its whole chat read.
 *       Returns the user's remaining unread count for the app icon badge.
 *     tags:
 *       - Push
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, token]
 *             properties:
 *               id:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Marked read (unread count returned)
 *       403:
 *         description: Unknown notification or wrong token
 */

/**
 * @swagger
 * /api/push/test:
 *   post:
 *     summary: Send a test notification to the user's devices
 *     tags:
 *       - Push
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test notification sent (`devices`, `sent`)
 *       400:
 *         description: No device has notifications turned on
 *       503:
 *         description: Push isn't configured on this server
 */

export {};
