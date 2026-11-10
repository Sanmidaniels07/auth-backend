import { GiftStatus, Prisma } from "@prisma/client";

/**
 * Gift orders reach the seller only once the recipient has claimed them
 * (that's when there's somewhere to deliver to). Until then they don't
 * show in the seller's orders and don't count toward their balance.
 */
export const SELLER_VISIBLE_ORDER = {
  OR: [{ gift: { is: null } }, { gift: { is: { status: GiftStatus.CLAIMED } } }],
} satisfies Prisma.OrderWhereInput;

/** How long the recipient has to claim a gift before it's refunded. */
export const GIFT_CLAIM_DAYS = 7;
