/**
 * @swagger
 * tags:
 *   name: Referral
 *   description: Seller share links (?ref=CODE) and their rewards
 */

/**
 * @swagger
 * /api/referrals/visit:
 *   post:
 *     summary: Count a visit through a seller's share link
 *     description: Public. Called by the website when a page is opened with ?ref=CODE (at most once a day per browser). Unknown codes and suspended stores are ignored. No personal data is stored - just the store and page.
 *     tags:
 *       - Referral
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: K7Q2MZPA
 *               path:
 *                 type: string
 *                 example: /marketplace/seller/raycakesandevents
 *     responses:
 *       204:
 *         description: Counted (or ignored)
 *       400:
 *         description: Invalid code
 */

/**
 * @swagger
 * /api/referrals/me:
 *   get:
 *     summary: The seller's referral code and results
 *     description: |
 *       Requires authentication and a store. Returns the store's \`code\` (for ?ref= links) and what the links brought in:
 *       \`visitsLast30Days\`, \`visitsTotal\`, \`buyersJoined\` (people who signed up after arriving through a link),
 *       \`ordersFromReferrals\`, \`salesFromReferrals\` and \`commissionSaved\` (naira).
 *       Reward: for \`rewardDays\` (90) after a referred buyer joins, the seller pays \`rewardPercent\` (2) percentage points
 *       less commission on that buyer's orders from their store - applied automatically at checkout (OrderItem.referralReward).
 *     tags:
 *       - Referral
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral stats fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Seller has no store
 */

export {};
