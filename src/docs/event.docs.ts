/**
 * @swagger
 * tags:
 *   name: Event
 *   description: Events with RSVPs
 */

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create an event
 *     description: Requires authentication. The creator is automatically RSVP'd as GOING.
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startAt
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               coverImage:
 *                 type: string
 *               location:
 *                 type: string
 *               startAt:
 *                 type: string
 *                 format: date-time
 *               endAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Event created successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *   get:
 *     summary: List events
 *     description: Public endpoint (personalized if authenticated), paginated. Defaults to upcoming events, ordered soonest first.
 *     tags:
 *       - Event
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
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [upcoming, past, all]
 *           default: upcoming
 *     responses:
 *       200:
 *         description: Events fetched successfully
 */

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get an event by id
 *     description: Public endpoint (personalized if authenticated, includes `myRsvpStatus`).
 *     tags:
 *       - Event
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event fetched successfully
 *       404:
 *         description: Event not found
 */

/**
 * @swagger
 * /api/events/{id}/attendees:
 *   get:
 *     summary: Get an event's attendees
 *     description: Public endpoint, paginated.
 *     tags:
 *       - Event
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Attendees fetched successfully
 *       404:
 *         description: Event not found
 */

/**
 * @swagger
 * /api/events/{id}/rsvp:
 *   post:
 *     summary: RSVP to an event
 *     description: Requires authentication. Upserts - calling again with a different status updates it.
 *     tags:
 *       - Event
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
 *                 enum: [GOING, INTERESTED]
 *     responses:
 *       200:
 *         description: RSVP recorded successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Event not found
 *   delete:
 *     summary: Cancel an RSVP
 *     description: Requires authentication.
 *     tags:
 *       - Event
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
 *         description: RSVP cancelled successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: No RSVP found for this event
 */

export {};
