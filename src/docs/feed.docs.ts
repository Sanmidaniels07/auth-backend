/**
 * @swagger
 * tags:
 *   name: Feed
 *   description: The shopping feed - what's actually happening on Nestly.
 */

/**
 * @swagger
 * /api/feed:
 *   get:
 *     summary: The shopping feed (home)
 *     description: >-
 *       One page of items, newest first: PURCHASE (a review - only possible for delivered items - with the buyer, rating,
 *       comment, photos and the product), DROP (a store's new items, one card per store per day, up to 8 products) and
 *       POST (posts; ones tagging a product rank higher, plain ones lower). Each item has `reason` FOLLOWING (people and
 *       stores you follow) or POPULAR (filling a thin network from across Nestly - happy reviews, verified stores' new
 *       items, product posts). Pass `before` = the previous page's `nextBefore` for the next page (null = the end). The
 *       first page also has `highlights` - live (stores live now, ones you follow first), birthdays (people you follow,
 *       within 7 days - `inDays`), groupGifts (open group gifts started by people you follow, never one for you).
 *       Blocked users are left out.
 *     tags:
 *       - Feed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 5
 *           maximum: 40
 *     responses:
 *       200:
 *         description: "{ items, nextBefore, highlights }"
 */

/**
 * @swagger
 * /api/feed/area:
 *   get:
 *     summary: The area "Near me" uses
 *     description: >-
 *       The one the viewer picked (source CHOSEN), else their default delivery address (ADDRESS), else their profile
 *       location (PROFILE), else null. { state, area (null = the whole state), label e.g. "Lekki, Lagos", source }.
 *       GET /api/feed?near=true shows only activity from stores based in or delivering to it (their new items, their
 *       buyers' reviews, their product posts, their lives; reason NEAR) and adds `area` with `storeCount`; with no area
 *       yet it returns no items and area null.
 *     tags:
 *       - Feed
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The area, or null
 *   put:
 *     summary: Choose the area "Near me" uses
 *     description: state (any spelling - "Lagos", "FCT"...) and optionally area (one of GET /area/options). 400 for unknown ones.
 *     tags:
 *       - Feed
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [state]
 *             properties:
 *               state:
 *                 type: string
 *                 example: Lagos
 *               area:
 *                 type: string
 *                 nullable: true
 *                 example: Lekki
 *     responses:
 *       200:
 *         description: Saved - the area as GET returns it
 *       400:
 *         description: Unknown state or area
 */

/**
 * @swagger
 * /api/feed/area/options:
 *   get:
 *     summary: The areas of a state, for the "Near me" picker
 *     tags:
 *       - Feed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "{ state, areas }"
 */
