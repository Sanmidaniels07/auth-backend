import { ReturnRequestStatus } from "@prisma/client";

/**
 * Problem reports still being sorted out. While one is open on an item,
 * the seller's payout for that order is held and delivery isn't
 * auto-confirmed.
 */
export const OPEN_RETURN_STATUSES: ReturnRequestStatus[] = [
  ReturnRequestStatus.REQUESTED,
  ReturnRequestStatus.APPROVED,
  ReturnRequestStatus.REPLACEMENT,
  ReturnRequestStatus.DISPUTED,
];
