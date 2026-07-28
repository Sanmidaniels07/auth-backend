import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { optionalAuthMiddleware } from "../../middleware/optional-auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createEventSchema,
  listEventsSchema,
  eventIdSchema,
  rsvpSchema,
  listAttendeesSchema,
} from "./event.validation";
import {
  createEvent,
  listEvents,
  getEventById,
  rsvpToEvent,
  cancelRsvp,
  getEventAttendees,
} from "./event.controller";

const router = Router();

router.post(
  "/",
  authMiddleware,
  validate(createEventSchema),
  createEvent
);

router.get(
  "/",
  optionalAuthMiddleware,
  validate(listEventsSchema),
  listEvents
);

router.get(
  "/:id/attendees",
  validate(listAttendeesSchema),
  getEventAttendees
);

router.post(
  "/:id/rsvp",
  authMiddleware,
  validate(rsvpSchema),
  rsvpToEvent
);

router.delete(
  "/:id/rsvp",
  authMiddleware,
  validate(eventIdSchema),
  cancelRsvp
);

router.get(
  "/:id",
  optionalAuthMiddleware,
  validate(eventIdSchema),
  getEventById
);

export default router;