/**
 * @swagger
 * tags:
 *   name: Address
 *   description: User shipping addresses
 */

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: Create an address
 *     description: Requires authentication. The first address a user creates, or any address created with isDefault true, becomes the default (unsetting any previous default).
 *     tags:
 *       - Address
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phone
 *               - address
 *               - city
 *               - state
 *               - country
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Address created successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *   get:
 *     summary: List the authenticated user's addresses
 *     description: Requires authentication. The default address (if any) is listed first.
 *     tags:
 *       - Address
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Addresses fetched successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 */

/**
 * @swagger
 * /api/addresses/{id}:
 *   patch:
 *     summary: Update an address
 *     description: Requires authentication and ownership. Setting isDefault true unsets any other default address.
 *     tags:
 *       - Address
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
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not the owner of this address
 *       404:
 *         description: Address not found
 *   delete:
 *     summary: Delete an address
 *     description: Requires authentication and ownership. Fails if the address is referenced by a past order. If the deleted address was the default, the oldest remaining address becomes the new default.
 *     tags:
 *       - Address
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
 *         description: Address deleted successfully
 *       400:
 *         description: Address used in past orders
 *       401:
 *         description: Unauthorized - no or invalid token
 *       403:
 *         description: Not the owner of this address
 *       404:
 *         description: Address not found
 */

export {};
