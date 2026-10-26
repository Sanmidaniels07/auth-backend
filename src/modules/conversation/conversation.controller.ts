import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { IdParams } from "../../types/request.types";
import {
  getOrCreateConversationService,
  getConversationsService,
  getMessagesService,
  sendMessageService,
  markConversationReadService,
  reactToMessageService,
  deleteMessageService,
} from "./conversation.service";

export const createConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const conversation = await getOrCreateConversationService(
      req.user.id,
      req.body.userId
    );

    res.status(201).json(
      apiResponse(
        conversation,
        "Conversation ready"
      )
    );
  }
);

export const getConversations = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getConversationsService(
      req.user.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Conversations fetched successfully"
      )
    );
  }
);

export const getMessages = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;

    const result = await getMessagesService(
      req.user.id,
      req.params.id,
      page,
      limit
    );

    res.status(200).json(
      apiResponse(
        result,
        "Messages fetched successfully"
      )
    );
  }
);

export const sendMessage = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    const message = await sendMessageService(
      req.user.id,
      req.params.id,
      req.body.content,
      req.body.media,
      req.body.replyToId,
      req.body.productId
    );

    res.status(201).json(
      apiResponse(message, "Message sent successfully")
    );
  }
);

export const markConversationRead = asyncHandler(
  async (req: Request<IdParams>, res: Response) => {
    await markConversationReadService(
      req.user.id,
      req.params.id
    );

    res.status(200).json(
      apiResponse(
        null,
        "Conversation marked as read"
      )
    );
  }
);

export const reactToMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const message = await reactToMessageService(
      req.user.id,
      req.params.id as string,
      req.params.messageId as string,
      req.body.emoji
    );

    res.status(200).json(apiResponse(message, "Reaction saved"));
  }
);

export const deleteMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const message = await deleteMessageService(
      req.user.id,
      req.params.id as string,
      req.params.messageId as string
    );

    res.status(200).json(apiResponse(message, "Message deleted"));
  }
);
