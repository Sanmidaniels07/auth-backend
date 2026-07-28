import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createReportSchema,
  listReportsSchema,
  updateReportStatusSchema,
} from "./report.validation";
import {
  createReport,
  listReports,
  updateReportStatus,
} from "./report.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createReportSchema), createReport);

router.get(
  "/",
  authorize("ADMIN"),
  validate(listReportsSchema),
  listReports
);

router.patch(
  "/:id",
  authorize("ADMIN"),
  validate(updateReportStatusSchema),
  updateReportStatus
);

export default router;
