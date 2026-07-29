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

/**
 * @swagger
 * /api/events/{id}:
 *   patch:
 *     summary: Update an event
 *     description: Requires authentication. Only the event creator can update it.
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
 *       200:
 *         description: Event updated successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - only the creator can update this event
 *       404:
 *         description: Event not found
 *   delete:
 *     summary: Cancel (delete) an event
 *     description: Requires authentication. Only the event creator can cancel it.
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
 *         description: Event cancelled successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - only the creator can cancel this event
 *       404:
 *         description: Event not found
 */

/**
 * @swagger
 * /api/events/{id}/comments:
 *   post:
 *     summary: Comment on an event
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       404:
 *         description: Event not found
 *   get:
 *     summary: List comments on an event
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
 *         description: Comments fetched successfully
 *       404:
 *         description: Event not found
 */

/**
 * @swagger
 * /api/events/comments/{commentId}:
 *   delete:
 *     summary: Delete an event comment
 *     description: Requires authentication. Only the comment author can delete it.
 *     tags:
 *       - Event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Forbidden - only the comment author can delete this comment
 *       404:
 *         description: Comment not found
 */

export {};
