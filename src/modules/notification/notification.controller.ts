import { Request, Response } from "express";

import {
  getNotificationsService,
  markNotificationReadService,
  markAllNotificationsReadService,
  getNotificationPreferencesService,
  updateNotificationPreferenceService,
  registerPushTokenService,
  unregisterPushTokenService,
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

export const markAllNotificationsRead = asyncHandler(
  async (req: Request, res: Response) => {
    await markAllNotificationsReadService(req.user.id);

    res.status(200).json(
      apiResponse(
        null,
        "All notifications marked as read"
      )
    );
  }
);

export const getNotificationPreferences = asyncHandler(
  async (req: Request, res: Response) => {
    const preferences = await getNotificationPreferencesService(
      req.user.id
    );

    res.status(200).json(
      apiResponse(
        preferences,
        "Notification preferences fetched successfully"
      )
    );
  }
);

export const updateNotificationPreference = asyncHandler(
  async (req: Request, res: Response) => {
    const preference = await updateNotificationPreferenceService(
      req.user.id,
      req.body.type,
      req.body.enabled
    );

    res.status(200).json(
      apiResponse(
        preference,
        "Notification preference updated successfully"
      )
    );
  }
);

export const registerPushToken = asyncHandler(
  async (req: Request, res: Response) => {
    const pushToken = await registerPushTokenService(
      req.user.id,
      req.body.token,
      req.body.platform
    );

    res.status(201).json(
      apiResponse(
        pushToken,
        "Push token registered successfully"
      )
    );
  }
);

interface TokenParams {
  token: string;
}

export const unregisterPushToken = asyncHandler(
  async (req: Request<TokenParams>, res: Response) => {
    await unregisterPushTokenService(
      req.user.id,
      req.params.token
    );

    res.status(200).json(
      apiResponse(
        null,
        "Push token unregistered successfully"
      )
    );
  }
);