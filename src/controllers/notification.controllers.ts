import { Response } from "express";
import { AuthRequest } from "../middleware/auth-middleware";

import {
  getNotificationsService,
  markNotificationReadService,
} from "../services/notification.services";

import { asyncHandler } from "../utils/asyncHandlers";
import { apiResponse } from "../utils/apiResponse";


export const getNotifications =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response
    ) => {
      const notifications =
        await getNotificationsService(
          req.user!.id
        );

      res.status(200).json(
        apiResponse(
          notifications,
          "Notifications fetched"
        )
      );
    }
  );

  export const markNotificationRead =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response
    ) => {
      const notificationId =
        req.params.id as string;

      await markNotificationReadService(
        notificationId,
        req.user!.id
      );

      res.status(200).json(
        apiResponse(
          null,
          "Notification marked as read"
        )
      );
    }
  );