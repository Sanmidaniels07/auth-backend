import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import { reverseGeocodeSchema, searchPlacesSchema, stateLocationsSchema } from "./location.validation";
import { getStateLocations, listStates, reverseGeocode, searchPlaces } from "./location.controller";

const router = Router();

router.get("/states", listStates);

// Areas, cities and states buyers can shop near ("Shop near you").
router.get("/search", validate(searchPlacesSchema), searchPlaces);

// Before /states/:state so "reverse" is never read as a state name.
router.get("/reverse", authMiddleware, validate(reverseGeocodeSchema), reverseGeocode);

router.get("/states/:state", validate(stateLocationsSchema), getStateLocations);

export default router;
