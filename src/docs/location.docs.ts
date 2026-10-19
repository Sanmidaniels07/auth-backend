/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Nigerian states, local government areas and suggested delivery zones - used to suggest shipping zones to sellers and to match buyers' addresses at checkout.
 */

/**
 * @swagger
 * /api/locations/states:
 *   get:
 *     summary: List Nigerian states
 *     description: Public. All 36 states plus the Federal Capital Territory, with how many local government areas each has and whether ready-made delivery zones exist for it.
 *     tags:
 *       - Locations
 *     security: []
 *     responses:
 *       200:
 *         description: States fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: States fetched successfully
 *               data:
 *                 - { name: "Lagos", lgaCount: 20, hasSuggestedZones: true }
 *                 - { name: "Katsina", lgaCount: 34, hasSuggestedZones: false }
 */

/**
 * @swagger
 * /api/locations/states/{state}:
 *   get:
 *     summary: Areas and suggested delivery zones for a state
 *     description: |
 *       Public. The state name is matched loosely ("Lagos", "lagos state", "Abuja", "FCT" all work).
 *       Returns the state's local government areas, a sorted list of areas to build zones from
 *       (popular neighbourhoods plus every LGA), and ready-made zone groupings for the biggest
 *       cities (Lagos, Abuja, Port Harcourt, Ibadan, Ogun) that a seller only has to price.
 *     tags:
 *       - Locations
 *     security: []
 *     parameters:
 *       - in: path
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         example: Lagos
 *     responses:
 *       200:
 *         description: Locations fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Locations fetched successfully
 *               data:
 *                 state: Lagos
 *                 lgas: ["Agege", "Ajeromi-Ifelodun", "Alimosho"]
 *                 areas: ["Abule Egba", "Agege", "Ago"]
 *                 suggestedZones:
 *                   - name: "Amuwo Odofin / Festac / Ago / Okota / Mile 2"
 *                     areas: ["Amuwo Odofin", "Festac", "Ago", "Okota", "Mile 2"]
 *       404:
 *         description: Unknown state
 */

/**
 * @swagger
 * /api/locations/reverse:
 *   get:
 *     summary: Detect the Nigerian state for a set of coordinates
 *     description: Requires authentication. Used by "Detect my location" - the browser supplies coordinates and the server looks up the state with OpenStreetMap. Only the state (and city, if known) is returned; coordinates are not stored.
 *     tags:
 *       - Locations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         example: 6.5244
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         example: 3.3792
 *     responses:
 *       200:
 *         description: Location detected successfully (state is null if it couldn't be matched)
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Location detected successfully
 *               data: { state: "Lagos", city: "Ikeja" }
 *       400:
 *         description: Missing or invalid coordinates
 *       401:
 *         description: Unauthorized - no or invalid token
 *       422:
 *         description: Location is outside Nigeria
 *       502:
 *         description: The location service couldn't be reached
 */

export {};
