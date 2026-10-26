import crypto from "crypto";
import {
  OrderStatus,
  ProductStatus,
  NotificationType,
  OrderEventActor,
  OrderEventType,
  ShippingOptionType,
  DeliveryVehicle,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  chargeAuthorization,
  estimatePaystackFeeKobo,
  PaystackSplitConfig,
} from "../../utils/paystack";
import {
  validateCouponForOrder,
  redeemCouponService,
} from "../coupon/coupon.service";
import { createNotificationService } from "../notification/notification.service";
import { saveCardFromAuthorization } from "../payment-method/payment-method.service";
import { isPayoutAccountEligibleForSplit, storePickupAddress } from "../store/store.service";
import { generateDeliveryCode, recordOrderEvent } from "../order/order-delivery";
import { notifyOrderPaid } from "../order/order-notifications";
import { snapshotOf } from "../../utils/orderItemSnapshot";
import { unitPriceOf, variationLabel } from "../../utils/productOptions";
import { VEHICLE_LABEL, canCarry, requiredVehicle } from "../../utils/deliveryVehicle";
import { referralCommission, referralRewardApplies } from "../../utils/referral";
import { hideContacts } from "../../utils/contactFilter";

const NAIRA_TO_KOBO = 100;
const LOW_STOCK_THRESHOLD = 5;

interface ShippingSelection {
  storeId: string;
  shippingOptionId: string;
}

export interface SellerNoteInput {
  storeId: string;
  note: string;
}

const buildPendingOrder = async (
  userId: string,
  addressId: string,
  shippingSelections: ShippingSelection[],
  couponCode?: string,
  sellerNotes: SellerNoteInput[] = [],
  deliveryPhone?: string,
) => {
  const [user, address, cart] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.address.findUnique({ where: { id: addressId } }),
    prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: true,
                specifications: true,
                options: true,
                variations: { where: { isArchived: false }, select: { id: true } },
              },
            },
            variation: true,
          },
        },
      },
    }),
  ]);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (!address || address.userId !== userId) {
    throw new AppError("Address not found.", 404);
  }

  if (!cart || cart.items.length === 0) {
    throw new AppError("Your cart is empty.", 400);
  }

  for (const item of cart.items) {
    if (item.product.status !== ProductStatus.PUBLISHED) {
      throw new AppError(
        `"${item.product.title}" is no longer available.`,
        400,
      );
    }

    // Products with options are bought as one of their combinations - a
    // line added before the seller added options has to be chosen again.
    if (item.product.variations.length > 0 && !item.variation) {
      throw new AppError(`Choose an option for "${item.product.title}" in your cart.`, 400);
    }

    if (item.variation && (!item.variation.isActive || item.variation.isArchived)) {
      throw new AppError(
        `"${item.product.title}" (${variationLabel(item.product.options, item.variation)}) is no longer available.`,
        400,
      );
    }

    const stock = item.variation ? item.variation.stock : item.product.stock;
    if (item.quantity > stock) {
      throw new AppError(`Not enough stock for "${item.product.title}".`, 400);
    }
  }

  // A combination's own price, else the product's.
  const priceOf = (item: (typeof cart.items)[number]) => unitPriceOf(item.product, item.variation);

  const subtotal = cart.items.reduce(
    (sum, item) => sum + priceOf(item) * item.quantity,
    0,
  );

  // A cart can span multiple stores, and each store may have its own
  // shipping tiers - so shipping is selected and priced per store, not
  // once for the whole order.
  const storeIds = Array.from(
    new Set(cart.items.map((item) => item.product.storeId)),
  );

  const stores = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    include: {
      shippingOptions: { where: { isArchived: false } },
      seller: { select: { userId: true } },
    },
  });

  // Buyers who joined through a store's share link: that store pays less
  // commission on their orders for a while.
  const rewardedStores = new Set(
    stores
      .filter((store) => referralRewardApplies(user, { id: store.id, sellerUserId: store.seller.userId }))
      .map((store) => store.id),
  );
  const commissionOf = (item: (typeof cart.items)[number]) =>
    rewardedStores.has(item.product.storeId)
      ? referralCommission(item.product.category.commissionRate)
      : item.product.category.commissionRate;

  const shippingRows: {
    storeId: string;
    optionName: string;
    fee: number;
    eta: string | null;
    type: ShippingOptionType;
    pickupAddress: string | null;
    vehicle: DeliveryVehicle | null;
    deliveryCode: string;
    paidViaSplit: boolean;
  }[] = [];

  let deliveryFee = 0;

  for (const store of stores) {
    // The buyer needs a way to get the order - at least one delivery zone
    // or a pickup point (pickup on its own is fine).
    if (store.shippingOptions.length === 0) {
      throw new AppError(
        `"${store.name}" hasn't set up delivery or pickup yet, so this can't be ordered right now.` + " Remove it from your cart to check out the rest.",
        400,
      );
    }

    // Only zones whose vehicle can carry everything bought from this store
    // (plus pickup) are on offer.
    const storeProducts = cart.items.filter((item) => item.product.storeId === store.id).map((item) => item.product);
    const needed = requiredVehicle(storeProducts);
    const usable = store.shippingOptions.filter((option) => canCarry(option, needed));

    if (usable.length === 0) {
      const big = storeProducts.find((product) => product.deliveryVehicle === needed);
      throw new AppError(
        `"${store.name}" has no delivery zone that can carry "${big?.title ?? "your items"}" (it needs a ${VEHICLE_LABEL[needed]}). Remove it from your cart or ask the seller.`,
        400,
      );
    }

    const selection = shippingSelections.find((s) => s.storeId === store.id);

    if (!selection) {
      throw new AppError(`Select a shipping option for "${store.name}".`, 400);
    }

    const option = store.shippingOptions.find(
      (o) => o.id === selection.shippingOptionId,
    );

    if (!option) {
      throw new AppError(`Invalid shipping option for "${store.name}".`, 400);
    }

    if (!canCarry(option, needed)) {
      throw new AppError(
        `"${option.name}" is by ${option.vehicle ? VEHICLE_LABEL[option.vehicle] : "a smaller vehicle"} - your items from "${store.name}" need a ${VEHICLE_LABEL[needed]}. Choose another delivery option.`,
        400,
      );
    }

    shippingRows.push({
      storeId: store.id,
      optionName: option.name,
      fee: option.fee,
      eta: option.eta,
      type: option.type,
      // Snapshot the collection point so later edits to the store don't
      // change where an existing order is picked up.
      pickupAddress:
        option.type === ShippingOptionType.PICKUP
          ? option.pickupAddress ?? storePickupAddress(store)
          : null,
      vehicle: option.type === ShippingOptionType.PICKUP ? null : option.vehicle,
      // One code per seller in the order - the buyer hands it over when
      // that seller's items arrive.
      deliveryCode: generateDeliveryCode(),
      // The seller does the delivery, so the fee is theirs - it rides along
      // in their split share below when they're eligible for one.
      paidViaSplit: isPayoutAccountEligibleForSplit(store),
    });

    deliveryFee += option.fee;
  }

  // Stores with a Paystack subaccount get their net-of-commission share
  // (plus their delivery fee, which carries no commission) routed straight
  // to them via a dynamic split, built fresh for this
  // order - unless that subaccount's bank details changed too recently
  // (see isPayoutAccountEligibleForSplit), in which case they fall back to
  // the manual Payout ledger for now, same as a store with no subaccount
  // at all. This is what lets both flows coexist.
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const netKoboByStore = new Map<string, number>();

  for (const item of cart.items) {
    const store = storeById.get(item.product.storeId);
    if (!store || !isPayoutAccountEligibleForSplit(store)) continue;

    const net =
      priceOf(item) *
      item.quantity *
      (1 - commissionOf(item) / 100);

    netKoboByStore.set(
      store.id,
      (netKoboByStore.get(store.id) ?? 0) + Math.round(net * NAIRA_TO_KOBO),
    );
  }

  for (const row of shippingRows) {
    if (!row.paidViaSplit || row.fee <= 0) continue;

    netKoboByStore.set(
      row.storeId,
      (netKoboByStore.get(row.storeId) ?? 0) + Math.round(row.fee * NAIRA_TO_KOBO),
    );
  }

  // No tax rules exist yet.
  const tax = 0;

  let discountAmount = 0;
  let appliedCouponCode: string | undefined;

  if (couponCode) {
    const validated = await validateCouponForOrder(
      couponCode,
      userId,
      subtotal,
    );
    discountAmount = validated.discountAmount;
    appliedCouponCode = validated.coupon.code;
  }

  const total = subtotal - discountAmount + deliveryFee + tax;

  // Nestly pays Paystack's whole fee out of what's left for the main
  // account (commission, less any coupon). If that can't cover it - a 0%
  // category, a small item with a big delivery fee - this order shares the
  // fee by amount instead, so the payment still goes through.
  const subaccounts = Array.from(netKoboByStore, ([storeId, shareKobo]) => ({
    subaccount: storeById.get(storeId)!.paystackSubaccountCode!,
    share: shareKobo,
  }));
  const totalKobo = Math.round(total * NAIRA_TO_KOBO);
  const mainAccountKobo = totalKobo - subaccounts.reduce((sum, s) => sum + s.share, 0);
  const split: PaystackSplitConfig | undefined =
    subaccounts.length > 0
      ? {
          type: "flat",
          currency: "NGN",
          bearer_type: mainAccountKobo >= estimatePaystackFeeKobo(totalKobo) ? "account" : "all-proportional",
          subaccounts,
        }
      : undefined;

  const reference = `NESTLY_${crypto.randomUUID().replace(/-/g, "")}`;

  // Keep only non-empty notes for stores actually in this cart, one each.
  const noteByStore = new Map<string, string>();
  for (const { storeId, note } of sellerNotes) {
    // Contact details go in the delivery phone field, not notes (see
    // utils/contactFilter).
    const text = hideContacts(note.trim()).text;
    if (text && storeIds.includes(storeId)) noteByStore.set(storeId, text);
  }
  const noteRows = Array.from(noteByStore, ([storeId, note]) => ({ storeId, note }));

  const order = await prisma.order.create({
    data: {
      userId,
      addressId,
      status: OrderStatus.PENDING,
      subtotal,
      deliveryFee,
      tax,
      discountAmount,
      couponCode: appliedCouponCode,
      total,
      paymentMethod: "PAYSTACK",
      paymentReference: reference,
      deliveryPhone: deliveryPhone?.trim() || address.phone,
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: priceOf(item),
          totalPrice: priceOf(item) * item.quantity,
          // Snapshot the category's current commission rate so a later
          // rate change doesn't retroactively affect this order.
          commissionRate: commissionOf(item),
          referralReward: rewardedStores.has(item.product.storeId),
          // What the buyer is paying for - later edits to the listing
          // don't change it.
          ...snapshotOf(item.product),
          variationId: item.variation?.id ?? null,
          variantLabel: item.variation ? variationLabel(item.product.options, item.variation) : null,
          autoPaidViaSplit: (() => {
            const itemStore = storeById.get(item.product.storeId);
            return !!itemStore && isPayoutAccountEligibleForSplit(itemStore);
          })(),
        })),
      },
      shipping: shippingRows.length > 0 ? { create: shippingRows } : undefined,
      sellerNotes: noteRows.length > 0 ? { create: noteRows } : undefined,
    },
    include: { items: true, shipping: true },
  });

  return { user, order, reference, total, split };
};

const notifyLowStock = (
  sellerUserId: string,
  productId: string,
  productTitle: string,
  stock: number,
) => {
  createNotificationService(
    sellerUserId,
    "Low stock alert",
    `"${productTitle}" is down to ${stock} unit${
      stock === 1 ? "" : "s"
    } in stock.`,
    NotificationType.ORDER,
    { type: "PRODUCT", id: productId },
  ).catch((error) => {
    console.error("Notification failed:", error);
  });
};

const finalizeOrderPayment = async (order: {
  id: string;
  userId: string;
  couponCode: string | null;
  items: { productId: string; variationId: string | null; quantity: number }[];
}) => {
  const updatedOrder = await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      // The product's stock is the total of its combinations, so both move.
      if (item.variationId) {
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const updatedProduct = await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
        include: { store: { select: { sellerId: true } } },
      });

      if (
        updatedProduct.stock <= 0 &&
        updatedProduct.status === ProductStatus.PUBLISHED
      ) {
        await tx.product.update({
          where: { id: item.productId },
          data: { status: ProductStatus.OUT_OF_STOCK },
        });
      }

      if (
        updatedProduct.stock > 0 &&
        updatedProduct.stock <= LOW_STOCK_THRESHOLD
      ) {
        const seller = await tx.sellerProfile.findUnique({
          where: { id: updatedProduct.store.sellerId },
        });

        if (seller) {
          notifyLowStock(
            seller.userId,
            updatedProduct.id,
            updatedProduct.title,
            updatedProduct.stock,
          );
        }
      }
    }

    const cart = await tx.cart.findUnique({
      where: { userId: order.userId },
    });

    if (cart) {
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    await recordOrderEvent(tx, {
      orderId: order.id,
      type: OrderEventType.PAID,
      actor: OrderEventActor.SYSTEM,
    });

    return tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAID },
      include: { items: true },
    });
  });

  // Runs once per order (callers claim the order first), so the buyer and
  // sellers are told exactly once.
  notifyOrderPaid(order.id);

  if (order.couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: order.couponCode },
    });

    if (coupon) {
      await redeemCouponService(coupon.id, order.userId, order.id).catch(
        (error) => {
          console.error("Coupon redemption recording failed:", error);
        },
      );
    }
  }

  return updatedOrder;
};

export const initiateCheckoutService = async (
  userId: string,
  addressId: string,
  shippingSelections: ShippingSelection[] = [],
  couponCode?: string,
  sellerNotes: SellerNoteInput[] = [],
  deliveryPhone?: string,
) => {
  const { user, order, reference, total, split } = await buildPendingOrder(
    userId,
    addressId,
    shippingSelections,
    couponCode,
    sellerNotes,
    deliveryPhone,
  );

  const paystackData = await initializePaystackTransaction({
    email: user.email,
    amountKobo: Math.round(total * NAIRA_TO_KOBO),
    reference,
    callbackUrl: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/marketplace/orders`
      : undefined,
    split,
  });

  return {
    order,
    authorizationUrl: paystackData.authorization_url,
    accessCode: paystackData.access_code,
    reference,
  };
};

export const checkoutWithSavedCardService = async (
  userId: string,
  addressId: string,
  savedCardId: string,
  shippingSelections: ShippingSelection[] = [],
  couponCode?: string,
  sellerNotes: SellerNoteInput[] = [],
  deliveryPhone?: string,
) => {
  const savedCard = await prisma.savedCard.findUnique({
    where: { id: savedCardId },
  });

  if (!savedCard || savedCard.userId !== userId) {
    throw new AppError("Saved card not found.", 404);
  }

  const { user, order, reference, total, split } = await buildPendingOrder(
    userId,
    addressId,
    shippingSelections,
    couponCode,
    sellerNotes,
    deliveryPhone,
  );

  const chargeResult = await chargeAuthorization({
    email: user.email,
    amountKobo: Math.round(total * NAIRA_TO_KOBO),
    reference,
    authorizationCode: savedCard.authorizationCode,
    split,
  });

  if (chargeResult.status !== "success") {
    throw new AppError(
      "Charge was not successful. Please try a different payment method.",
      400,
    );
  }

  return finalizeOrderPayment(order);
};

export const confirmPaymentByReferenceService = async (reference: string) => {
  const order = await prisma.order.findUnique({
    where: { paymentReference: reference },
    include: { items: true },
  });

  if (!order) {
    throw new AppError("Order not found for this payment reference.", 404);
  }

  // Idempotent: a webhook and a manual verify call can both land on the same order.
  if (order.status !== OrderStatus.PENDING) {
    return order;
  }

  const paystackData = await verifyPaystackTransaction(reference);

  if (paystackData.status !== "success") {
    throw new AppError("Payment was not successful.", 400);
  }

  if (Math.round(order.total * NAIRA_TO_KOBO) !== paystackData.amount) {
    throw new AppError("Payment amount mismatch.", 400);
  }

  // Atomically claim the order before finalizing it. A webhook and a manual
  // verify call can both reach this point for the same order almost
  // simultaneously - without this, both would pass the PENDING check above
  // and both would run finalizeOrderPayment, double-decrementing stock.
  // Only the caller whose conditional update actually matches a row wins.
  const claim = await prisma.order.updateMany({
    where: { id: order.id, status: OrderStatus.PENDING },
    data: { status: OrderStatus.PAID },
  });

  if (claim.count === 0) {
    return prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
  }

  const updatedOrder = await finalizeOrderPayment(order);

  if (paystackData.authorization?.reusable) {
    saveCardFromAuthorization(order.userId, paystackData.authorization).catch(
      (error) => {
        console.error("Saving card failed:", error);
      },
    );
  }

  return updatedOrder;
};

export const verifyCheckoutService = async (
  userId: string,
  reference: string,
) => {
  const order = await prisma.order.findUnique({
    where: { paymentReference: reference },
  });

  if (!order || order.userId !== userId) {
    throw new AppError("Order not found.", 404);
  }

  return confirmPaymentByReferenceService(reference);
};
