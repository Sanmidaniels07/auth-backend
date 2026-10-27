import crypto from "crypto";
import {
  OrderItemStatus,
  OrderStatus,
  PaymentLinkDelivery,
  Prisma,
  ProductStatus,
  ShippingOptionType,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { generateUniqueSlug } from "../../utils/slugify";
import { initializePaystackTransaction } from "../../utils/paystack";
import { snapshotOf } from "../../utils/orderItemSnapshot";
import { referralCommission, referralRewardApplies } from "../../utils/referral";
import { hideContacts } from "../../utils/contactFilter";
import { getSellerStore } from "../seller/seller.utils";
import { isPayoutAccountEligibleForSplit, storePickupAddress } from "../store/store.service";
import { generateDeliveryCode } from "../order/order-delivery";
import { paystackSplitFor } from "../checkout/checkout.service";
import {
  CreatePaymentLinkInput,
  PayPaymentLinkInput,
  UpdatePaymentLinkInput,
} from "./payment-link.validation";

// Protected payment links: a seller turns a deal agreed in DMs or WhatsApp
// into a link; the buyer pays through Nestly and it becomes a normal order
// (delivery code, buyer protection, payouts). The item is a PRIVATE
// product, so orders, snapshots and payouts work exactly as for listings.

const NAIRA_TO_KOBO = 100;

const PAID_ORDER_STATUSES = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

// No 0/O, 1/l/I - codes get read out and typed.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

const generateCode = () =>
  Array.from(crypto.randomBytes(CODE_LENGTH), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");

const uniqueCode = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    if (!(await prisma.paymentLink.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
  throw new AppError("Couldn't create a link right now. Please try again.", 500);
};

const LINK_PRODUCT_INCLUDE = {
  images: { orderBy: [{ isPrimary: "desc" as const }, { id: "asc" as const }] },
  category: { select: { id: true, name: true, slug: true } },
};

type LinkWithProduct = Prisma.PaymentLinkGetPayload<{
  include: { product: { include: typeof LINK_PRODUCT_INCLUDE } };
}>;

// The first photo is the cover unless one is marked.
const withPrimary = (images: { url: string; isPrimary?: boolean }[] = []) => {
  const primary = Math.max(0, images.findIndex((image) => image.isPrimary));
  return images.map((image, index) => ({ url: image.url, isPrimary: index === primary }));
};

const assertCategory = async (categoryId: string) => {
  if (!(await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    throw new AppError("Category not found.", 404);
  }
};

const assertPickupPossible = (
  deliveryType: PaymentLinkDelivery,
  store: { address: string | null; city: string | null; state: string | null }
) => {
  if (deliveryType === PaymentLinkDelivery.PICKUP && !storePickupAddress(store)) {
    throw new AppError("Add your store's address first so buyers know where to pick up.", 400);
  }
};

/** Paid orders through each link: how many orders, units and naira (cancelled items left out). */
const salesByProduct = async (productIds: string[]) => {
  if (!productIds.length) return new Map<string, { orders: number; units: number; revenue: number }>();
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      status: { not: OrderItemStatus.CANCELLED },
      order: { status: { in: PAID_ORDER_STATUSES } },
    },
    _count: { _all: true },
    _sum: { quantity: true, totalPrice: true },
  });
  return new Map(
    rows.map((row) => [
      row.productId,
      { orders: row._count._all, units: row._sum.quantity ?? 0, revenue: row._sum.totalPrice ?? 0 },
    ])
  );
};

const forSeller = (link: LinkWithProduct, sales?: { orders: number; units: number; revenue: number }) => ({
  id: link.id,
  code: link.code,
  title: link.product.title,
  description: link.product.description,
  price: link.product.price,
  // Still available to buy through the link.
  quantity: link.product.stock,
  images: link.product.images.map(({ id, url, isPrimary }) => ({ id, url, isPrimary })),
  category: link.product.category,
  deliveryType: link.deliveryType,
  deliveryFee: link.deliveryFee,
  isActive: link.isActive,
  createdAt: link.createdAt,
  updatedAt: link.updatedAt,
  sales: sales ?? { orders: 0, units: 0, revenue: 0 },
});

const getOwnedLink = async (userId: string, id: string) => {
  const store = await getSellerStore(userId);
  const link = await prisma.paymentLink.findFirst({
    where: { id, storeId: store.id, isArchived: false },
    include: { product: { include: LINK_PRODUCT_INCLUDE } },
  });
  if (!link) throw new AppError("Payment link not found.", 404);
  return { store, link };
};

export const createPaymentLinkService = async (userId: string, data: CreatePaymentLinkInput) => {
  const store = await getSellerStore(userId);
  if (store.isSuspended) throw new AppError("Your store is suspended, so you can't create payment links.", 403);

  await assertCategory(data.categoryId);
  assertPickupPossible(data.deliveryType, store);

  const code = await uniqueCode();
  const slug = await generateUniqueSlug(data.title, async (candidate) =>
    !!(await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } }))
  );

  const link = await prisma.paymentLink.create({
    data: {
      code,
      deliveryType: data.deliveryType,
      deliveryFee: data.deliveryType === PaymentLinkDelivery.DELIVERY ? data.deliveryFee ?? 0 : 0,
      store: { connect: { id: store.id } },
      product: {
        create: {
          title: data.title,
          description: data.description ?? "",
          price: data.price,
          stock: data.quantity ?? 1,
          sku: `LINK-${code}`,
          slug,
          status: ProductStatus.PRIVATE,
          // Never announced to followers - it isn't listed.
          followersNotifiedAt: new Date(),
          store: { connect: { id: store.id } },
          category: { connect: { id: data.categoryId } },
          images: data.images?.length ? { create: withPrimary(data.images) } : undefined,
        },
      },
    },
    include: { product: { include: LINK_PRODUCT_INCLUDE } },
  });

  return forSeller(link);
};

/** The seller's links (deleted ones left out), newest first, with what each has sold. */
export const getMyPaymentLinksService = async (userId: string) => {
  const store = await getSellerStore(userId);
  const links = await prisma.paymentLink.findMany({
    where: { storeId: store.id, isArchived: false },
    orderBy: { createdAt: "desc" },
    include: { product: { include: LINK_PRODUCT_INCLUDE } },
  });
  const sales = await salesByProduct(links.map((link) => link.productId));
  return links.map((link) => forSeller(link, sales.get(link.productId)));
};

export const updatePaymentLinkService = async (userId: string, id: string, data: UpdatePaymentLinkInput) => {
  const { store, link } = await getOwnedLink(userId, id);

  if (data.categoryId) await assertCategory(data.categoryId);
  const deliveryType = data.deliveryType ?? link.deliveryType;
  assertPickupPossible(deliveryType, store);

  const deliveryFee =
    deliveryType === PaymentLinkDelivery.PICKUP ? 0 : data.deliveryFee ?? link.deliveryFee;

  const updated = await prisma.$transaction(async (tx) => {
    if (data.images) {
      await tx.productImage.deleteMany({ where: { productId: link.productId } });
    }
    await tx.product.update({
      where: { id: link.productId },
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        stock: data.quantity,
        categoryId: data.categoryId,
        images: data.images?.length ? { create: withPrimary(data.images) } : undefined,
      },
    });
    return tx.paymentLink.update({
      where: { id: link.id },
      data: { deliveryType, deliveryFee, isActive: data.isActive },
      include: { product: { include: LINK_PRODUCT_INCLUDE } },
    });
  });

  const sales = await salesByProduct([updated.productId]);
  return forSeller(updated, sales.get(updated.productId));
};

/** Deletes the link for the seller. Orders already paid through it are kept. */
export const deletePaymentLinkService = async (userId: string, id: string) => {
  const { link } = await getOwnedLink(userId, id);
  await prisma.paymentLink.update({
    where: { id: link.id },
    data: { isArchived: true, isActive: false },
  });
};

type Availability = "AVAILABLE" | "SOLD_OUT" | "PAUSED";

const availabilityOf = (link: { isActive: boolean; product: { stock: number } }): Availability =>
  !link.isActive ? "PAUSED" : link.product.stock <= 0 ? "SOLD_OUT" : "AVAILABLE";

const PUBLIC_LINK_INCLUDE = {
  product: { include: LINK_PRODUCT_INCLUDE },
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      city: true,
      state: true,
      address: true,
      isVerified: true,
      isSuspended: true,
      rating: true,
      paystackSubaccountCode: true,
      payoutAccountUpdatedAt: true,
      seller: { select: { userId: true } },
    },
  },
} satisfies Prisma.PaymentLinkInclude;

const findLiveLink = async (code: string) => {
  const link = await prisma.paymentLink.findUnique({ where: { code }, include: PUBLIC_LINK_INCLUDE });
  if (!link || link.isArchived || link.store.isSuspended) {
    throw new AppError("This payment link doesn't exist or has been removed.", 404);
  }
  return link;
};

/** What the pay page shows. Public - the link is meant to be shared. */
export const getPublicPaymentLinkService = async (code: string, viewerId?: string) => {
  const link = await findLiveLink(code);
  const { store, product } = link;

  return {
    code: link.code,
    title: product.title,
    description: product.description,
    price: product.price,
    images: product.images.map(({ url, isPrimary }) => ({ url, isPrimary })),
    category: product.category,
    quantityAvailable: Math.max(0, product.stock),
    deliveryType: link.deliveryType,
    deliveryFee: link.deliveryFee,
    pickupAddress: link.deliveryType === PaymentLinkDelivery.PICKUP ? storePickupAddress(store) : null,
    availability: availabilityOf(link),
    isOwner: !!viewerId && viewerId === store.seller.userId,
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      city: store.city,
      state: store.state,
      isVerified: store.isVerified,
      rating: store.rating,
      sellerUserId: store.seller.userId,
    },
    createdAt: link.createdAt,
  };
};

/**
 * Starts paying through a link: creates the pending order and the Paystack
 * transaction. Payment is confirmed through the usual checkout verify /
 * webhook, which then works like any order (stock, notifications, payouts).
 */
export const payPaymentLinkService = async (userId: string, code: string, data: PayPaymentLinkInput) => {
  const quantity = data.quantity ?? 1;

  const [link, user, address] = await Promise.all([
    findLiveLink(code),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.address.findUnique({ where: { id: data.addressId } }),
  ]);

  if (!user) throw new AppError("User not found.", 404);
  if (!address || address.userId !== userId) throw new AppError("Address not found.", 404);

  const { store, product } = link;

  if (store.seller.userId === userId) {
    throw new AppError("This is your own payment link - share it with your buyer.", 400);
  }
  const availability = availabilityOf(link);
  if (availability === "PAUSED") throw new AppError("The seller has paused this link. Message them to turn it back on.", 400);
  if (availability === "SOLD_OUT") throw new AppError("This item has sold out.", 400);
  if (quantity > product.stock) {
    throw new AppError(`Only ${product.stock} left - lower the quantity.`, 400);
  }

  const fullProduct = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    include: { images: true, specifications: true, category: true },
  });

  const commissionRate = referralRewardApplies(user, { id: store.id, sellerUserId: store.seller.userId })
    ? referralCommission(fullProduct.category.commissionRate)
    : fullProduct.category.commissionRate;
  const referralReward = commissionRate !== fullProduct.category.commissionRate;

  const isPickup = link.deliveryType === PaymentLinkDelivery.PICKUP;
  const subtotal = product.price * quantity;
  const deliveryFee = isPickup ? 0 : link.deliveryFee;
  const total = subtotal + deliveryFee;
  const totalKobo = Math.round(total * NAIRA_TO_KOBO);

  // Seller's share (less commission, plus the delivery fee) goes straight
  // to their Paystack subaccount when they have one - same as cart orders.
  const paidViaSplit = isPayoutAccountEligibleForSplit(store);
  const split = paidViaSplit
    ? paystackSplitFor(totalKobo, [
        {
          subaccount: store.paystackSubaccountCode!,
          share:
            Math.round(subtotal * (1 - commissionRate / 100) * NAIRA_TO_KOBO) +
            Math.round(deliveryFee * NAIRA_TO_KOBO),
        },
      ])
    : undefined;

  const note = data.note ? hideContacts(data.note.trim()).text : "";
  const reference = `NESTLY_${crypto.randomUUID().replace(/-/g, "")}`;

  const order = await prisma.order.create({
    data: {
      userId,
      addressId: address.id,
      paymentLinkId: link.id,
      status: OrderStatus.PENDING,
      subtotal,
      deliveryFee,
      tax: 0,
      total,
      paymentMethod: "PAYSTACK",
      paymentReference: reference,
      deliveryPhone: data.deliveryPhone?.trim() || address.phone,
      items: {
        create: {
          productId: product.id,
          quantity,
          unitPrice: product.price,
          totalPrice: subtotal,
          commissionRate,
          referralReward,
          autoPaidViaSplit: paidViaSplit,
          ...snapshotOf(fullProduct),
        },
      },
      shipping: {
        create: {
          storeId: store.id,
          optionName: isPickup ? "Pickup" : "Delivery (agreed with seller)",
          fee: deliveryFee,
          eta: null,
          type: isPickup ? ShippingOptionType.PICKUP : ShippingOptionType.DELIVERY,
          pickupAddress: isPickup ? storePickupAddress(store) : null,
          vehicle: null,
          deliveryCode: generateDeliveryCode(),
          paidViaSplit,
        },
      },
      sellerNotes: note ? { create: { storeId: store.id, note } } : undefined,
    },
  });

  const paystack = await initializePaystackTransaction({
    email: user.email,
    amountKobo: totalKobo,
    reference,
    callbackUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/marketplace/orders` : undefined,
    split,
  });

  return {
    orderId: order.id,
    reference,
    accessCode: paystack.access_code,
    authorizationUrl: paystack.authorization_url,
    total,
  };
};
