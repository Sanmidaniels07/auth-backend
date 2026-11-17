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
