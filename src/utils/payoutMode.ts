import { isPayoutAccountEligibleForSplit } from "../modules/store/store.service";

// How sellers get paid. Two switches (environment variables), both off by
// default so nothing changes until they're turned on:
//
// PAYOUTS_HOLD=true       Hold-then-pay. New orders aren't split at checkout:
//                         the whole payment lands with Nestly, and each
//                         seller's part is paid out once the items are
//                         delivered, the return window has closed and no
//                         report is open. Refunds then come from money Nestly
//                         still holds, so Nestly never has to claw money back.
//                         Off: the old Paystack split at checkout.
//
// PAYSTACK_TRANSFERS=true Held money is sent automatically by Paystack
//                         Transfer (needs Transfers enabled on the Paystack
//                         business, transfer OTP off, and funds in the
//                         Paystack balance). Off: held payouts wait as
//                         "ready" for an admin to pay by hand.

export const holdPayoutsEnabled = () => process.env.PAYOUTS_HOLD === "true";

export const transfersEnabled = () => process.env.PAYSTACK_TRANSFERS === "true";

/**
 * Whether this store's share of a new order goes straight to its Paystack
 * subaccount. Never for a store still under review (utils/sellerReview).
 */
export const routeViaSplit = (store: {
  paystackSubaccountCode: string | null;
  payoutAccountUpdatedAt: Date | null;
  underReview: boolean;
}) => !holdPayoutsEnabled() && !store.underReview && isPayoutAccountEligibleForSplit(store);

/**
 * Whether this store's part of a new order is held and paid out after
 * delivery and the return window (hold-then-pay) - always for a store
 * under review.
 */
export const holdPayoutFor = (store: { underReview: boolean }) => holdPayoutsEnabled() || store.underReview;
