import { Prisma, ProductStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { unitPriceOf, variationLabel } from "../../utils/productOptions";

const CART_ITEM_INCLUDE = {
  product: {
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      // Lets checkout group items by seller by name (notes, delivery).
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          _count: { select: { shippingOptions: { where: { isArchived: false } } } },
        },
      },
      options: { select: { name: true, position: true } },
    },
  },
  variation: true,
};

type CartItemWithProduct = Prisma.CartItemGetPayload<{ include: typeof CART_ITEM_INCLUDE }>;

// Adds what the cart page needs per line: the price of the chosen
// combination and a label like "Size: Large · Flavour: Vanilla".
const presentItem = (item: CartItemWithProduct) => {
  const { options, store, ...rest } = item.product;
  const { _count, ...storeSummary } = store;
  return {
    ...item,
    // canDeliver: the store has a delivery zone or pickup point.
    product: { ...rest, store: { ...storeSummary, canDeliver: _count.shippingOptions > 0 } },
    unitPrice: unitPriceOf(item.product, item.variation),
    variantLabel: item.variation ? variationLabel(options, item.variation) : null,
  };
};

const availableStock = (item: { product: { stock: number }; variation: { stock: number } | null }) =>
  item.variation ? item.variation.stock : item.product.stock;

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

  const items = cart.items.map(presentItem);

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const itemCount = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return {
    id: cart.id,
    items,
    subtotal,
    itemCount,
  };
};

export const addToCartService = async (
  userId: string,
  productId: string,
  quantity: number,
  variationId?: string
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variations: { where: { isArchived: false }, select: { id: true, stock: true, isActive: true } },
      store: { select: { name: true, _count: { select: { shippingOptions: { where: { isArchived: false } } } } } },
    },
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

  // Buyers need a way to get it: a delivery zone or pickup point.
  if (product.store._count.shippingOptions === 0) {
    throw new AppError(`"${product.store.name}" hasn't set up delivery or pickup yet, so this can't be ordered right now.`, 400);
  }

  // Products with options are bought as one of their combinations.
  const variation = variationId ? product.variations.find((v) => v.id === variationId) : null;

  if (product.variations.length > 0 && !variationId) {
    throw new AppError("Choose an option before adding this to your cart.", 400);
  }

  if (variationId && (!variation || !variation.isActive)) {
    throw new AppError("That option is no longer available.", 400);
  }

  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const existingItem = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variationId: variationId ?? null },
  });

  const newQuantity = existingItem
    ? existingItem.quantity + quantity
    : quantity;

  if (newQuantity > (variation ? variation.stock : product.stock)) {
    throw new AppError(
      "Requested quantity exceeds available stock.",
      400
    );
  }

  const item = existingItem
    ? await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: CART_ITEM_INCLUDE,
      })
    : await prisma.cartItem.create({
        data: { cartId: cart.id, productId, variationId: variationId ?? null, quantity },
        include: CART_ITEM_INCLUDE,
      });

  return presentItem(item);
};

// Cart lines are addressed by their own id. A product id still works for
// a product that's in the cart only once (older app versions use it).
const findCartLine = async (userId: string, id: string) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    throw new AppError("Cart is empty.", 404);
  }

  const lines = await prisma.cartItem.findMany({
    where: { cartId: cart.id, OR: [{ id }, { productId: id }] },
    include: { product: true, variation: true },
  });

  const line = lines.find((item) => item.id === id) ?? (lines.length === 1 ? lines[0] : undefined);

  if (!line) {
    throw new AppError("Product not found in cart.", 404);
  }

  return line;
};

export const updateCartItemService = async (
  userId: string,
  id: string,
  quantity: number
) => {
  const item = await findCartLine(userId, id);

  if (quantity > availableStock(item)) {
    throw new AppError(
      "Requested quantity exceeds available stock.",
      400
    );
  }

  const updated = await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
    include: CART_ITEM_INCLUDE,
  });

  return presentItem(updated);
};

export const removeCartItemService = async (
  userId: string,
  id: string
) => {
  const item = await findCartLine(userId, id);

  await prisma.cartItem.delete({
    where: { id: item.id },
  });
};
