import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  addToCartSchema,
  updateCartItemSchema,
  removeCartItemSchema,
} from "./cart.validation";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
} from "./cart.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getCart);

router.post("/", validate(addToCartSchema), addToCart);

router.patch(
  "/:productId",
  validate(updateCartItemSchema),
  updateCartItem
);

router.delete(
  "/:productId",
  validate(removeCartItemSchema),
  removeCartItem
);

export default router;
