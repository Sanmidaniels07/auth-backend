import { AppError } from "./appError";

// Quick start lets a new seller sell within minutes, before an admin has
// looked at them (Store.underReview). Until the review, two safeguards
// keep buyers' money safe:
//
// 1. Payouts are held: no Paystack split at checkout, so the money stays
//    with Nestly, and held payouts aren't sent until the store is reviewed
//    (on top of the usual wait for delivery and the return window).
// 2. One order from the store is capped at NEW_SELLER_ORDER_LIMIT naira
//    (items + delivery), so a bad actor can't take a big payment.
//
// An admin approving the seller clears both (admin sellers "Mark reviewed").

const DEFAULT_LIMIT = 200_000;

/** Naira. Set NEW_SELLER_ORDER_LIMIT to change it (e.g. 100000). */
export const newSellerOrderLimit = () => {
  const fromEnv = Number(process.env.NEW_SELLER_ORDER_LIMIT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_LIMIT;
};

const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

/** Throws when a store under review would take more than the limit in one order. */
export const assertWithinReviewLimit = (
  store: { name: string; underReview: boolean },
  amount: number,
  forSeller = false
) => {
  if (!store.underReview || amount <= newSellerOrderLimit()) return;
  throw new AppError(
    forSeller
      ? `While your store is new and being reviewed, one order can be up to ${naira(newSellerOrderLimit())}. Lower the price or quantity - the limit goes once Nestly has reviewed your store (usually within a day).`
      : `"${store.name}" is new on Nestly, so one order from them can be up to ${naira(newSellerOrderLimit())} for now. Lower the quantity, or split it into smaller orders.`,
    400
  );
};
