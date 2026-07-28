import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createAddressSchema,
  updateAddressSchema,
  deleteAddressSchema,
} from "./address.validation";
import {
  createAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
} from "./address.controller";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  validate(createAddressSchema),
  createAddress
);

router.get("/", getAddresses);

router.patch(
  "/:id",
  validate(updateAddressSchema),
  updateAddress
);

router.delete(
  "/:id",
  validate(deleteAddressSchema),
  deleteAddress
);

export default router;
