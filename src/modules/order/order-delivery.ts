import crypto from "crypto";
import { OrderEventActor, OrderEventType, Prisma, PrismaClient } from "@prisma/client";

// Delivered-but-unconfirmed items confirm themselves after this long.
// Staging can shorten it (e.g. AUTO_CONFIRM_DAYS=0.01 = ~15 minutes) so
// testers can see auto-confirm happen.
export const AUTO_CONFIRM_DAYS = Number(process.env.AUTO_CONFIRM_DAYS) > 0 ? Number(process.env.AUTO_CONFIRM_DAYS) : 5;
// Nestly's returns policy: problems (damaged, spoiled, wrong, not as
// described, faulty, not received) can be reported this long after delivery
// is confirmed. No change-of-mind returns.
export const RETURN_WINDOW_DAYS = 3;
// Perishable categories (food, cakes...): report within 24 hours, with a
// photo - the item isn't sent back.
export const PERISHABLE_REPORT_HOURS = 24;
// Deliveries confirmed before the policy changed keep the old 7 days.
export const PREVIOUS_RETURN_WINDOW_DAYS = 7;
export const RETURN_POLICY_EFFECTIVE_AT = new Date("2026-11-10T00:00:00+01:00");
// Wrong delivery-code entries allowed before the code locks.
export const MAX_DELIVERY_CODE_ATTEMPTS = 5;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const generateDeliveryCode = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

export const orderNumber = (orderId: string) => `#${orderId.slice(-8).toUpperCase()}`;

/** When the window to report a problem closes for an item confirmed at confirmedAt. */
export const returnWindowEndsAt = (confirmedAt: Date, perishable = false) => {
  const length =
    confirmedAt < RETURN_POLICY_EFFECTIVE_AT
      ? PREVIOUS_RETURN_WINDOW_DAYS * DAY_MS
      : perishable
        ? PERISHABLE_REPORT_HOURS * HOUR_MS
        : RETURN_WINDOW_DAYS * DAY_MS;
  return new Date(confirmedAt.getTime() + length);
};

/** "24 hours" / "3 days" - for messages. */
export const returnWindowLabel = (confirmedAt: Date | null, perishable = false) =>
  confirmedAt && confirmedAt < RETURN_POLICY_EFFECTIVE_AT
    ? `${PREVIOUS_RETURN_WINDOW_DAYS} days`
    : perishable
      ? `${PERISHABLE_REPORT_HOURS} hours`
      : `${RETURN_WINDOW_DAYS} days`;

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
