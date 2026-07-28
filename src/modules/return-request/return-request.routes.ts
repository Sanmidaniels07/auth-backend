import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createReturnRequestSchema,
  listReturnRequestsSchema,
  updateReturnRequestStatusSchema,
} from "./return-request.validation";
import {
  createReturnRequest,
  getCustomerReturnRequests,
  getSellerReturnRequests,
  updateReturnRequestStatus,
} from "./return-request.controller";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  validate(createReturnRequestSchema),
  createReturnRequest
);

router.get(
  "/seller",
  validate(listReturnRequestsSchema),
  getSellerReturnRequests
);

router.patch(
  "/:id/status",
  validate(updateReturnRequestStatusSchema),
  updateReturnRequestStatus
);

router.get(
  "/",
  validate(listReturnRequestsSchema),
  getCustomerReturnRequests
);

export default router;
