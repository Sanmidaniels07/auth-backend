import { Request, Response } from "express";

import {
  getNotificationsService,
  markNotificationReadService,
} from "./notification.service";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";

import { IdParams } from "../../types/request.types";

export const getNotifications = asyncHandler(
  async (
    req: Request,
    res: Response
  ) => {
    const notifications =
      await getNotificationsService(req.user.id);

    res.status(200).json(
      apiResponse(
        notifications,
        "Notifications fetched"
      )
    );
  }
);

export const markNotificationRead = asyncHandler(
  async (
    req: Request<IdParams>,
    res: Response
  ) => {
    await markNotificationReadService(
      req.params.id,
      req.user.id
    );

    res.status(200).json(
      apiResponse(
        null,
        "Notification marked as read"
      )
    );
  }
);