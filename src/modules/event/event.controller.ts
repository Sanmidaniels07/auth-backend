import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import {
  createEventService,
  listEventsService,
  getEventByIdService,
  rsvpToEventService,
  cancelRsvpService,
  getEventAttendeesService,
  updateEventService,
  cancelEventService,
  createEventCommentService,
  getEventCommentsService,
  deleteEventCommentService,
} from "./event.service";

interface CommentIdParams {
  commentId: string;
}

export const createEvent = asyncHandler(
  async (req: Request, res: Response) => {
    const event = await createEventService(
      req.user.id,
      req.body
    );

    res.status(201).json(
      apiResponse(event, "Event created successfully")
    );
  }
);

export const listEvents = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const scope = (req.query.scope as string) || "upcoming";

    const result = await listEventsService(
      page,
      limit,
      scope
    );

    res.status(200).json(
      apiResponse(result, "Events fetched successfully")
    );
  }
);

export const getEventById = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const event = await getEventByIdService(
      req.params.id,
      req.user?.id
    );

    res.status(200).json(
      apiResponse(event, "Event fetched successfully")
    );
  }
);

export const rsvpToEvent = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const attendee = await rsvpToEventService(
      req.params.id,
      req.user.id,
      req.body.status
    );

    res.status(200).json(
      apiResponse(
        attendee,
        "RSVP recorded successfully"
      )
    );
  }
);

export const cancelRsvp = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await cancelRsvpService(req.params.id, req.user.id);

    res.status(200).json(
      apiResponse(null, "RSVP cancelled successfully")
    );
  }
);

export const updateEvent = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const event = await updateEventService(
      req.user.id,
      req.params.id,
      req.body
    );

    res.status(200).json(
      apiResponse(event, "Event updated successfully")
    );
  }
);

export const cancelEvent = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await cancelEventService(req.user.id, req.params.id);

    res.status(200).json(
      apiResponse(null, "Event cancelled successfully")
    );
  }
);

export const createEventComment = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const comment = await createEventCommentService(
      req.user.id,
      req.params.id,
      req.body.content
    );

    res.status(201).json(
      apiResponse(comment, "Comment added successfully")
    );
  }
);

export const listEventComments = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getEventCommentsService(
      req.params.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Comments fetched successfully"
      )
    );
  }
);

export const deleteEventComment = asyncHandler(
  async (req: Request<CommentIdParams>, res: Response) => {
    await deleteEventCommentService(
      req.user.id,
      req.params.commentId
    );

    res.status(200).json(
      apiResponse(null, "Comment deleted successfully")
    );
  }
);

export const getEventAttendees = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getEventAttendeesService(
      req.params.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Attendees fetched successfully"
      )
    );
  }
);