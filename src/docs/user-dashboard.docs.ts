/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: The signed-in user's personal dashboard (not the seller dashboard - see Seller Dashboard).
 */

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get the personal dashboard overview
 *     description: |
 *       One call for the whole dashboard page. Requires authentication.
 *       Counts from blocked users (either direction) are excluded.
 *
 *       - **social** - followers, following, posts, likes and comments received on your posts (all time),
 *         plus profile views, new followers and new likes within the range.
 *       - **activity** - one entry per day in the range: likes received, profile views, new followers.
 *       - **shopping** - paid orders and total spent, orders in progress (paid/processing/shipped),
 *         wishlist count and cart item quantity.
 *       - **community** - communities joined and your next 3 upcoming events (created or RSVP'd going).
 *       - **inbox** - unread notifications and unread messages.
 *       - **upcomingBirthdays** - up to 5 people you follow with a birthday in the next 30 days.
 *       - **seller** - your seller application status and store, or null if you don't sell. `needsCacNumber` is true for approved sellers who haven't added a CAC number yet (show a reminder); `missingSetup` lists setup steps still to do (STORE, PAYOUT, DELIVERY, PRODUCT - see GET /api/seller/me/readiness).
 *         Store numbers come from `/api/seller/dashboard/*`.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         description: Range for the activity series and range-based counts.
 *         schema:
 *           type: string
 *           enum: ["7", "30", "90"]
 *           default: "30"
 *     responses:
 *       200:
 *         description: Dashboard fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Dashboard fetched successfully
 *               data:
 *                 range: { days: 30, since: "2026-09-17T00:00:00.000Z" }
 *                 social: { followers: 42, following: 30, posts: 12, likesReceived: 210, commentsReceived: 34, profileViews: 88, newFollowers: 5, newLikes: 61 }
 *                 activity: [{ date: "2026-10-16", likes: 3, views: 7, followers: 1 }]
 *                 shopping: { totalOrders: 4, activeOrders: 1, totalSpent: 56000, wishlistCount: 6, cartItems: 2 }
 *                 community: { communitiesJoined: 3, upcomingEvents: [{ id: "evt_1", title: "Lagos Meetup", startAt: "2026-10-20T16:00:00.000Z", location: "Yaba", coverImage: null }] }
 *                 inbox: { unreadNotifications: 2, unreadMessages: 1 }
 *                 upcomingBirthdays: [{ id: "usr_1", name: "Ada", username: "ada", avatar: null, date: "2026-10-18T00:00:00.000Z", daysAway: 2 }]
 *                 seller: { status: APPROVED, hasStore: true, store: { id: "st_1", name: "Raycakesandevents", slug: "raycakesandevents" } }
 *       400:
 *         description: Invalid days value (must be 7, 30 or 90)
 *       401:
 *         description: Unauthorized - no or invalid token
 */

export {};
