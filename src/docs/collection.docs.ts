/**
 * @swagger
 * tags:
 *   name: Collection
 *   description: A seller's hand-picked group of products shared as one link (nestlyapp.site/{store}/{collection}). Buyers see only those products, pick quantities and options, and check out once - with or without an account.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CollectionInput:
 *       type: object
 *       required: [name, productIds]
 *       properties:
 *         name:
 *           type: string
 *           example: Owambe outfits
 *         description:
 *           type: string
 *           nullable: true
 *           maxLength: 300
 *           example: Ready to wear for this weekend
 *         productIds:
 *           type: array
 *           minItems: 1
 *           maxItems: 50
 *           items:
 *             type: string
 *           description: The store's own products, in the order buyers see them. Each must be listed in the shop (published or sold out) - drafts, removed products and pay-link-only items are refused.
 *     SellerCollection:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *           description: Made from the name, unique in the store. Doesn't change when the name does (the link may be shared).
 *         description:
 *           type: string
 *           nullable: true
 *         isActive:
 *           type: boolean
 *         path:
 *           type: string
 *           example: /tolas-fabrics/owambe-outfits
 *           description: The share link's path on the website.
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id: { type: string }
 *               title: { type: string }
 *               price: { type: number }
 *               status: { type: string }
 *               image: { type: string, nullable: true }
 */

/**
 * @swagger
 * /api/collections/me:
 *   get:
 *     summary: My collections
 *     description: The seller's collections, newest first, with their products (any status, so a product that's no longer listed can be spotted).
 *     tags: [Collection]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Collections fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SellerCollection'
 *       403:
 *         description: Not an approved seller, or no store yet
 */

/**
 * @swagger
 * /api/collections:
 *   post:
 *     summary: Create a collection
 *     tags: [Collection]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CollectionInput'
 *     responses:
 *       201:
 *         description: Collection created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/SellerCollection'
 *       400:
 *         description: A product isn't the store's own, or isn't listed in the shop
 */

/**
 * @swagger
 * /api/collections/{id}:
 *   patch:
 *     summary: Edit a collection
 *     description: Change the name, description or products (the list replaces the old one, in that order), or switch it off/on with isActive. The link stays the same.
 *     tags: [Collection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string, nullable: true }
 *               productIds: { type: array, items: { type: string } }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Collection updated
 *       404:
 *         description: Not found (or not this seller's)
 *   delete:
 *     summary: Delete a collection
 *     description: Removes the collection and its link. The products themselves are untouched.
 *     tags: [Collection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Collection deleted
 *       404:
 *         description: Not found (or not this seller's)
 */

/**
 * @swagger
 * /api/collections/{store}/{slug}:
 *   get:
 *     summary: Public collection page
 *     description: What buyers see at nestlyapp.site/{store}/{slug}. Public. The store's current slug or one it had before a rename works. Products are the ones listed in the shop, in the seller's order, with their description, brand, condition, highlights and specifications, and options and variations so buyers can pick; soldOut marks ones that can't be bought now. A switched-off collection returns isActive false and no products. Suspended stores and unknown collections return 404.
 *     tags: [Collection]
 *     parameters:
 *       - in: path
 *         name: store
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Collection fetched
 *       404:
 *         description: Collection not found
 */
export {};
