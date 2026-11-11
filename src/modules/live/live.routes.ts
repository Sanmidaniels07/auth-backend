import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  banViewerSchema,
  buyFromLiveSchema,
  createLiveSchema,
  liveCodeSchema,
  liveIdSchema,
  listLivesSchema,
  pinProductSchema,
  removeMessageSchema,
  updateLiveSchema,
} from "./live.validation";
import {
  addInterest,
  banViewer,
  buyFromLive,
  cancelLive,
  createLive,
  endLive,
  getHostToken,
  getLiveCalendar,
  getLiveSummary,
  getMyLives,
  getPublicLive,
  getWatchToken,
  listLives,
  pinProduct,
  removeInterest,
  removeMessage,
  startLive,
  updateLive,
} from "./live.controller";

const router = Router();

// Discovery: live now + coming up (optionally one store's).
router.get("/", validate(listLivesSchema), listLives);

// Seller - by live id
router.post("/", authMiddleware, validate(createLiveSchema), createLive);
router.get("/me", authMiddleware, getMyLives);
router.patch("/:id", authMiddleware, validate(updateLiveSchema), updateLive);
router.post("/:id/cancel", authMiddleware, validate(liveIdSchema), cancelLive);
router.post("/:id/start", authMiddleware, validate(liveIdSchema), startLive);
router.post("/:id/host-token", authMiddleware, validate(liveIdSchema), getHostToken);
router.post("/:id/end", authMiddleware, validate(liveIdSchema), endLive);
router.post("/:id/pin", authMiddleware, validate(pinProductSchema), pinProduct);
router.delete("/:id/messages/:messageId", authMiddleware, validate(removeMessageSchema), removeMessage);
router.post("/:id/bans", authMiddleware, validate(banViewerSchema), banViewer);
router.get("/:id/summary", authMiddleware, validate(liveIdSchema), getLiveSummary);

// Public - by share code (/live/{code})
router.get("/:code", optionalAuthMiddleware, validate(liveCodeSchema), getPublicLive);
router.get("/:code/calendar.ics", validate(liveCodeSchema), getLiveCalendar);
router.post("/:code/interest", authMiddleware, validate(liveCodeSchema), addInterest);
router.delete("/:code/interest", authMiddleware, validate(liveCodeSchema), removeInterest);
router.post("/:code/watch", optionalAuthMiddleware, validate(liveCodeSchema), getWatchToken);
router.post("/:code/buy", authMiddleware, validate(buyFromLiveSchema), buyFromLive);

export default router;
