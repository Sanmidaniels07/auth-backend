import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { upload } from "../../middleware/upload.middleware";
import { uploadMedia } from "./upload.controller";

const router = Router();

router.post(
  "/",
  authMiddleware,
  upload.array("files", 10),
  uploadMedia
);

export default router;