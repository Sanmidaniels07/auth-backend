import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { reverseGeocodeSchema, stateLocationsSchema } from "./location.validation";
import { getStateLocations, listStates, reverseGeocode } from "./location.controller";

const router = Router();

router.get("/states", listStates);

// Before /states/:state so "reverse" is never read as a state name.
router.get("/reverse", authMiddleware, validate(reverseGeocodeSchema), reverseGeocode);

router.get("/states/:state", validate(stateLocationsSchema), getStateLocations);

export default router;
