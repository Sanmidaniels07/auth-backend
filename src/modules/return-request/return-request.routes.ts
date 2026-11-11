import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  buyerReturnActionSchema,
  createReturnRequestSchema,
  decideReturnSchema,
  listReturnRequestsSchema,
  sellerReturnResponseSchema,
} from "./return-request.validation";
import {
  buyerReturnAction,
  createReturnRequest,
  decideReturnRequest,
  getCustomerReturnRequests,
  getSellerReturnRequests,
  listAdminReturnRequests,
  respondToReturnRequest,
} from "./return-request.controller";

const router = Router();

router.use(authMiddleware);

// Buyer
router.post("/", validate(createReturnRequestSchema), createReturnRequest);
router.get("/", validate(listReturnRequestsSchema), getCustomerReturnRequests);
router.post("/:id/buyer-action", validate(buyerReturnActionSchema), buyerReturnAction);

// Seller
router.get("/seller", validate(listReturnRequestsSchema), getSellerReturnRequests);
router.post("/:id/respond", validate(sellerReturnResponseSchema), respondToReturnRequest);

// Nestly
router.get("/admin", authorize("ADMIN"), validate(listReturnRequestsSchema), listAdminReturnRequests);
router.post("/:id/decide", authorize("ADMIN"), validate(decideReturnSchema), decideReturnRequest);

export default router;
