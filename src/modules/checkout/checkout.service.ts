import crypto from "crypto";
import {
  OrderStatus,
  ProductStatus,
  NotificationType,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  chargeAuthorization,
} from "../../utils/paystack";
import {
  validateCouponForOrder,
  redeemCouponService,
} from "../coupon/coupon.service";
import { createNotificationService } from "../notification/notification.service";
import { saveCardFromAuthorization } from "../payment-method/payment-method.service";

const NAIRA_TO_KOBO = 100;
const LOW_STOCK_THRESHOLD = 5;

interface ShippingSelection {
  storeId: string;
  shippingOptionId: string;
}

const buildPendingOrder = async (
  userId: string,
  addressId: string,
  shippingSelections: ShippingSelection[],
  couponCode?: string
) => {
  const [user, address, cart] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.address.findUnique({ where: { id: addressId } }),
    prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
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
        400
      );
    }

    if (item.quantity > item.product.stock) {
      throw new AppError(
        `Not enough stock for "${item.product.title}".`,
        400
      );
    }
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // A cart can span multiple stores, and each store may have its own
  // shipping tiers - so shipping is selected and priced per store, not
  // once for the whole order.
  const storeIds = Array.from(
    new Set(cart.items.map((item) => item.product.storeId))
  );

  const stores = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    include: { shippingOptions: true },
  });

  const shippingRows: {
    storeId: string;
    optionName: string;
    fee: number;
    etaDays: number | null;
  }[] = [];

  let deliveryFee = 0;

  for (const store of stores) {
    if (store.shippingOptions.length === 0) {
      continue;
    }

    const selection = shippingSelections.find(
      (s) => s.storeId === store.id
    );

    if (!selection) {
      throw new AppError(
        `Select a shipping option for "${store.name}".`,
        400
      );
    }

    const option = store.shippingOptions.find(
      (o) => o.id === selection.shippingOptionId
    );

    if (!option) {
      throw new AppError(
        `Invalid shipping option for "${store.name}".`,
        400
      );
    }

    shippingRows.push({
      storeId: store.id,
      optionName: option.name,
      fee: option.fee,
      etaDays: option.etaDays,
    });

    deliveryFee += option.fee;
  }

  // No tax rules exist yet.
  const tax = 0;

  let discountAmount = 0;
  let appliedCouponCode: string | undefined;

  if (couponCode) {
    const validated = await validateCouponForOrder(
      couponCode,
      userId,
      subtotal
    );
    discountAmount = validated.discountAmount;
    appliedCouponCode = validated.coupon.code;
  }

  const total =
    subtotal - discountAmount + deliveryFee + tax;

  const reference = `NESTLY_${crypto
    .randomUUID()
    .replace(/-/g, "")}`;

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
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.product.price,
          totalPrice: item.product.price * item.quantity,
        })),
      },
      shipping:
        shippingRows.length > 0
          ? { create: shippingRows }
          : undefined,
    },
    include: { items: true, shipping: true },
  });

  return { user, order, reference, total };
};

const notifyLowStock = (
  sellerUserId: string,
  productId: string,
  productTitle: string,
  stock: number
) => {
  createNotificationService(
    sellerUserId,
    "Low stock alert",
    `"${productTitle}" is down to ${stock} unit${
      stock === 1 ? "" : "s"
    } in stock.`,
    NotificationType.ORDER,
    { type: "PRODUCT", id: productId }
  ).catch((error) => {
    console.error("Notification failed:", error);
  });
};

const finalizeOrderPayment = async (order: {
  id: string;
  userId: string;
  couponCode: string | null;
  items: { productId: string; quantity: number }[];
}) => {
  const updatedOrder = await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
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
            updatedProduct.stock
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

    return tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAID },
      include: { items: true },
    });
  });

  if (order.couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: order.couponCode },
    });

    if (coupon) {
      await redeemCouponService(
        coupon.id,
        order.userId,
        order.id
      ).catch((error) => {
        console.error(
          "Coupon redemption recording failed:",
          error
        );
      });
    }
  }

  return updatedOrder;
};

export const initiateCheckoutService = async (
  userId: string,
  addressId: string,
  shippingSelections: ShippingSelection[] = [],
  couponCode?: string
) => {
  const { user, order, reference, total } =
    await buildPendingOrder(
      userId,
      addressId,
      shippingSelections,
      couponCode
    );

  const paystackData = await initializePaystackTransaction({
    email: user.email,
    amountKobo: Math.round(total * NAIRA_TO_KOBO),
    reference,
    callbackUrl: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/checkout/callback`
      : undefined,
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
  couponCode?: string
) => {
  const savedCard = await prisma.savedCard.findUnique({
    where: { id: savedCardId },
  });

  if (!savedCard || savedCard.userId !== userId) {
    throw new AppError("Saved card not found.", 404);
  }

  const { user, order, reference, total } =
    await buildPendingOrder(
      userId,
      addressId,
      shippingSelections,
      couponCode
    );

  const chargeResult = await chargeAuthorization({
    email: user.email,
    amountKobo: Math.round(total * NAIRA_TO_KOBO),
    reference,
    authorizationCode: savedCard.authorizationCode,
  });

  if (chargeResult.status !== "success") {
    throw new AppError(
      "Charge was not successful. Please try a different payment method.",
      400
    );
  }

  return finalizeOrderPayment(order);
};

export const confirmPaymentByReferenceService = async (
  reference: string
) => {
  const order = await prisma.order.findUnique({
    where: { paymentReference: reference },
    include: { items: true },
  });

  if (!order) {
    throw new AppError(
      "Order not found for this payment reference.",
      404
    );
  }

  // Idempotent: a webhook and a manual verify call can both land on the same order.
  if (order.status !== OrderStatus.PENDING) {
    return order;
  }

  const paystackData = await verifyPaystackTransaction(
    reference
  );

  if (paystackData.status !== "success") {
    throw new AppError("Payment was not successful.", 400);
  }

  if (
    Math.round(order.total * NAIRA_TO_KOBO) !==
    paystackData.amount
  ) {
    throw new AppError("Payment amount mismatch.", 400);
  }

  const updatedOrder = await finalizeOrderPayment(order);

  if (paystackData.authorization?.reusable) {
    saveCardFromAuthorization(
      order.userId,
      paystackData.authorization
    ).catch((error) => {
      console.error("Saving card failed:", error);
    });
  }

  return updatedOrder;
};

export const verifyCheckoutService = async (
  userId: string,
  reference: string
) => {
  const order = await prisma.order.findUnique({
    where: { paymentReference: reference },
  });

  if (!order || order.userId !== userId) {
    throw new AppError("Order not found.", 404);
  }

  return confirmPaymentByReferenceService(reference);
};
