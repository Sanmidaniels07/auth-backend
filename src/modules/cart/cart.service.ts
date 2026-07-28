import { ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

const CART_ITEM_INCLUDE = {
  product: {
    include: {
      images: { where: { isPrimary: true }, take: 1 },
    },
  },
};

export const getCartService = async (userId: string) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: CART_ITEM_INCLUDE,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cart) {
    return { id: null, items: [], subtotal: 0, itemCount: 0 };
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const itemCount = cart.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return {
    id: cart.id,
    items: cart.items,
    subtotal,
    itemCount,
  };
};

export const addToCartService = async (
  userId: string,
  productId: string,
  quantity: number
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  if (product.status !== ProductStatus.PUBLISHED) {
    throw new AppError(
      "This product is not available.",
      400
    );
  }

  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: { cartId: cart.id, productId },
    },
  });

  const newQuantity = existingItem
    ? existingItem.quantity + quantity
    : quantity;

  if (newQuantity > product.stock) {
    throw new AppError(
      "Requested quantity exceeds available stock.",
      400
    );
  }

  if (existingItem) {
    return prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
      include: CART_ITEM_INCLUDE,
    });
  }

  return prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity },
    include: CART_ITEM_INCLUDE,
  });
};

export const updateCartItemService = async (
  userId: string,
  productId: string,
  quantity: number
) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    throw new AppError("Cart is empty.", 404);
  }

  const item = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: { cartId: cart.id, productId },
    },
    include: { product: true },
  });

  if (!item) {
    throw new AppError("Product not found in cart.", 404);
  }

  if (quantity > item.product.stock) {
    throw new AppError(
      "Requested quantity exceeds available stock.",
      400
    );
  }

  return prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
    include: CART_ITEM_INCLUDE,
  });
};

export const removeCartItemService = async (
  userId: string,
  productId: string
) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    throw new AppError("Cart is empty.", 404);
  }

  const item = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: { cartId: cart.id, productId },
    },
  });

  if (!item) {
    throw new AppError("Product not found in cart.", 404);
  }

  await prisma.cartItem.delete({
    where: { id: item.id },
  });
};
