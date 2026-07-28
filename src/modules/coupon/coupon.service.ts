import { CouponType } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

interface CreateCouponInput {
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount?: number;
  usageLimit?: number;
  expiresAt?: Date;
}

interface UpdateCouponInput {
  value?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  expiresAt?: Date;
  isActive?: boolean;
}

export const createCouponService = async (
  data: CreateCouponInput
) => {
  const code = data.code.toUpperCase();

  const existing = await prisma.coupon.findUnique({
    where: { code },
  });

  if (existing) {
    throw new AppError(
      "A coupon with this code already exists.",
      400
    );
  }

  return prisma.coupon.create({
    data: { ...data, code },
  });
};

export const listCouponsService = async (
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.coupon.count(),
  ]);

  return {
    coupons,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const updateCouponService = async (
  couponId: string,
  data: UpdateCouponInput
) => {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
  });

  if (!coupon) {
    throw new AppError("Coupon not found.", 404);
  }

  return prisma.coupon.update({
    where: { id: couponId },
    data,
  });
};

export const validateCouponAgainstCartService = async (
  userId: string,
  code: string
) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    throw new AppError("Your cart is empty.", 400);
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const { coupon, discountAmount } =
    await validateCouponForOrder(code, userId, subtotal);

  return {
    valid: true,
    discountAmount,
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
    },
  };
};

export const validateCouponForOrder = async (
  code: string,
  userId: string,
  subtotal: number
) => {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon || !coupon.isActive) {
    throw new AppError("Invalid coupon code.", 400);
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AppError("This coupon has expired.", 400);
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    throw new AppError(
      "This coupon has reached its usage limit.",
      400
    );
  }

  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    throw new AppError(
      `This coupon requires a minimum order of ${coupon.minOrderAmount}.`,
      400
    );
  }

  const alreadyRedeemed = await prisma.couponRedemption.findUnique({
    where: {
      couponId_userId: { couponId: coupon.id, userId },
    },
  });

  if (alreadyRedeemed) {
    throw new AppError(
      "You have already used this coupon.",
      400
    );
  }

  const discountAmount =
    coupon.type === CouponType.PERCENTAGE
      ? Math.min(subtotal, (subtotal * coupon.value) / 100)
      : Math.min(subtotal, coupon.value);

  return { coupon, discountAmount };
};

export const redeemCouponService = async (
  couponId: string,
  userId: string,
  orderId: string
) => {
  await prisma.$transaction([
    prisma.couponRedemption.create({
      data: { couponId, userId, orderId },
    }),
    prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    }),
  ]);
};
