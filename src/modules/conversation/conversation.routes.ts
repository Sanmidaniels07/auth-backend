import { Router } from "express";

import { authMiddleware } from "../../middleware/auth-middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createConversationSchema,
  listConversationsSchema,
  conversationIdSchema,
  listMessagesSchema,
  sendMessageSchema,
  reactToMessageSchema,
  deleteMessageSchema,
} from "./conversation.validation";
import {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  reactToMessage,
  deleteMessage,
} from "./conversation.controller";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  validate(createConversationSchema),
  createConversation
);

router.get(
  "/",
  validate(listConversationsSchema),
  getConversations
);

router.get(
  "/:id/messages",
  validate(listMessagesSchema),
  getMessages
);

router.post(
  "/:id/messages",
  validate(sendMessageSchema),
  sendMessage
);

router.put(
  "/:id/messages/:messageId/reaction",
  validate(reactToMessageSchema),
  reactToMessage
);

router.delete(
  "/:id/messages/:messageId",
  validate(deleteMessageSchema),
  deleteMessage
);

router.patch(
  "/:id/read",
  validate(conversationIdSchema),
  markConversationRead
);

export default router;
