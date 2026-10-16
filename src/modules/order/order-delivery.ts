import crypto from "crypto";
import { OrderEventActor, OrderEventType, Prisma, PrismaClient } from "@prisma/client";

// Delivered-but-unconfirmed items confirm themselves after this long.
export const AUTO_CONFIRM_DAYS = 5;
// Returns can be requested this long after delivery is confirmed.
export const RETURN_WINDOW_DAYS = 7;
// Wrong delivery-code entries allowed before the code locks.
export const MAX_DELIVERY_CODE_ATTEMPTS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export const generateDeliveryCode = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

export const orderNumber = (orderId: string) => `#${orderId.slice(-8).toUpperCase()}`;

export const returnWindowEndsAt = (confirmedAt: Date) => new Date(confirmedAt.getTime() + RETURN_WINDOW_DAYS * DAY_MS);

export const autoConfirmCutoff = (now = new Date()) => new Date(now.getTime() - AUTO_CONFIRM_DAYS * DAY_MS);

type Db = PrismaClient | Prisma.TransactionClient;

export const recordOrderEvent = (
  db: Db,
  event: {
    orderId: string;
    orderItemId?: string;
    type: OrderEventType;
    actor: OrderEventActor;
    note?: string;
  }
) => db.orderEvent.create({ data: event });
