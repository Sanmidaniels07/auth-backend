import crypto from "crypto";
import bcrypt from "bcrypt";
import {
  OrderItemStatus,
  OrderStatus,
  PaymentLinkDelivery,
  Prisma,
  ProductStatus,
  ShippingOption,
  ShippingOptionType,
  User,
  UserStatus,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { generateUniqueSlug } from "../../utils/slugify";
import { initializePaystackTransaction } from "../../utils/paystack";
import { snapshotOf } from "../../utils/orderItemSnapshot";
import { referralCommission, referralRewardApplies } from "../../utils/referral";
import { hideContacts } from "../../utils/contactFilter";
import { STOCK_HOLD_TX, assertStockAvailable } from "../../utils/stockHold";
import { getSellerStore } from "../seller/seller.utils";
import { storePickupAddress } from "../store/store.service";
import { holdPayoutFor, routeViaSplit } from "../../utils/payoutMode";
import { assertWithinReviewLimit } from "../../utils/sellerReview";
import { generateDeliveryCode } from "../order/order-delivery";
import { confirmPaymentByReferenceService, paystackSplitFor } from "../checkout/checkout.service";
import { confirmDeliveryService, getCustomerOrderByIdService } from "../order/order.service";
import { guestOrderUrl } from "../order/order-notifications";
import { forgotPasswordService } from "../auth/auth.service";
import { sendEmail } from "../auth/email.services";
import { verificationTemplate } from "../../templates/verification.template";
import { generateVerificationToken } from "../../utils/token";
import { declineGuestAccountService, generateGuestToken, guestAccountFor } from "../checkout/guest-account";
import { VEHICLE_LABEL, canCarry } from "../../utils/deliveryVehicle";
import { unitPriceOf, variationLabel } from "../../utils/productOptions";
import {
  CreatePaymentLinkInput,
  GuestPayPaymentLinkInput,
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
  // Shared from the shop: the listing's options (e.g. Size, Colour) and
  // combinations - the buyer picks one on the pay page.
  options: { orderBy: { position: "asc" as const } },
  variations: { where: { isArchived: false }, orderBy: { createdAt: "asc" as const } },
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

const assertDeliveryPossible = async (
  deliveryType: PaymentLinkDelivery,
  store: { id: string; address: string | null; city: string | null; state: string | null }
) => {
  if (deliveryType === PaymentLinkDelivery.PICKUP && !storePickupAddress(store)) {
    throw new AppError("Add your store's address first so buyers know where to pick up.", 400);
  }
  if (
    deliveryType === PaymentLinkDelivery.STORE_OPTIONS &&
    !(await prisma.shippingOption.count({ where: { storeId: store.id, isArchived: false } }))
  ) {
    throw new AppError(
      "Set up your delivery zones or a pickup point first (Store settings → Delivery), or set a delivery fee on the link.",
      400
    );
  }
};

// The fee only applies when the seller delivers for an agreed amount.
const feeFor = (deliveryType: PaymentLinkDelivery, fee: number | undefined) =>
  deliveryType === PaymentLinkDelivery.DELIVERY ? fee ?? 0 : 0;

/**
 * Paid orders through each link: how many orders, units and naira
 * (cancelled items left out), keyed by the link's product. Only orders
 * made through the link count - a listed product also sells in the shop.
 */
const salesByProduct = async (links: { id: string; productId: string }[]) => {
  if (!links.length) return new Map<string, { orders: number; units: number; revenue: number }>();
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { in: links.map((link) => link.productId) },
      status: { not: OrderItemStatus.CANCELLED },
      order: { status: { in: PAID_ORDER_STATUSES }, paymentLinkId: { in: links.map((link) => link.id) } },
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
  deliveryVehicle: link.product.deliveryVehicle,
  isActive: link.isActive,
  // Shared from a product in the shop: title, price, photos and stock are
  // the listing's (edited on the product), only delivery is the link's own.
  fromListing: link.fromListing,
  productId: link.fromListing ? link.productId : null,
  productStatus: link.product.status,
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
  await assertDeliveryPossible(data.deliveryType, store);
  // New store under review: a link nobody could pay is caught here.
  assertWithinReviewLimit(store, data.price + feeFor(data.deliveryType, data.deliveryFee), true);

  const code = await uniqueCode();
  const slug = await generateUniqueSlug(data.title, async (candidate) =>
    !!(await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } }))
  );

  const link = await prisma.paymentLink.create({
    data: {
      code,
      deliveryType: data.deliveryType,
      deliveryFee: feeFor(data.deliveryType, data.deliveryFee),
      store: { connect: { id: store.id } },
      product: {
        create: {
          title: data.title,
          description: data.description ?? "",
          price: data.price,
          stock: data.quantity ?? 1,
          deliveryVehicle: data.deliveryVehicle,
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
  const sales = await salesByProduct(links);
  return links.map((link) => forSeller(link, sales.get(link.productId)));
};

// Why a listed product can't be sold through a link right now (null = it can).
const listingProblem = (product: { status: ProductStatus }) => {
  if (product.status === ProductStatus.DRAFT) return "Publish this product first, then share its pay link.";
  if (product.status === ProductStatus.ARCHIVED || product.status === ProductStatus.PRIVATE) {
    return "This product isn't in your shop anymore.";
  }
  return null;
};

/**
 * "Share pay link" on a product in the shop: the link for that product,
 * made the first time and reused after (turned back on if it was paused or
 * deleted). Buyers pay for the real listing - same price, photos and stock -
 * without needing an account.
 */
export const createLinkFromProductService = async (userId: string, productId: string) => {
  const store = await getSellerStore(userId);
  if (store.isSuspended) throw new AppError("Your store is suspended, so you can't share pay links.", 403);

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true, price: true, status: true, variations: { where: { isArchived: false, isActive: true }, select: { price: true } } },
  });
  if (!product) throw new AppError("Product not found.", 404);
  const problem = listingProblem(product);
  if (problem) throw new AppError(problem, 400);

  const existing = await prisma.paymentLink.findUnique({ where: { productId: product.id } });
  if (existing) {
    const link = await prisma.paymentLink.update({
      where: { id: existing.id },
      data: { isActive: true, isArchived: false },
      include: { product: { include: LINK_PRODUCT_INCLUDE } },
    });
    const sales = await salesByProduct([link]);
    return forSeller(link, sales.get(link.productId));
  }

  // The buyer picks one of the store's zones / pickup points, as in the shop.
  await assertDeliveryPossible(PaymentLinkDelivery.STORE_OPTIONS, store);
  // With options: the cheapest combination has to be payable.
  assertWithinReviewLimit(store, Math.min(product.price, ...product.variations.map((v) => v.price ?? product.price)), true);

  try {
    const link = await prisma.paymentLink.create({
      data: {
        code: await uniqueCode(),
        fromListing: true,
        deliveryType: PaymentLinkDelivery.STORE_OPTIONS,
        store: { connect: { id: store.id } },
        product: { connect: { id: product.id } },
      },
      include: { product: { include: LINK_PRODUCT_INCLUDE } },
    });
    return forSeller(link);
  } catch (error) {
    // Tapped twice at once: the other tap made it.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const link = await prisma.paymentLink.findUniqueOrThrow({
        where: { productId: product.id },
        include: { product: { include: LINK_PRODUCT_INCLUDE } },
      });
      return forSeller(link);
    }
    throw error;
  }
};

export const updatePaymentLinkService = async (userId: string, id: string, data: UpdatePaymentLinkInput) => {
  const { store, link } = await getOwnedLink(userId, id);

  if (data.categoryId) await assertCategory(data.categoryId);
  const deliveryType = data.deliveryType ?? link.deliveryType;
  await assertDeliveryPossible(deliveryType, store);
  const deliveryFee = feeFor(deliveryType, data.deliveryFee ?? link.deliveryFee);
  assertWithinReviewLimit(store, (data.price ?? link.product.price) + deliveryFee, true);

  // Shared from a product in the shop: the item is the listing itself, edited
  // on the product page - only delivery and on / off belong to the link.
  if (link.fromListing) {
    const updated = await prisma.paymentLink.update({
      where: { id: link.id },
      data: { deliveryType, deliveryFee, isActive: data.isActive },
      include: { product: { include: LINK_PRODUCT_INCLUDE } },
    });
    const sales = await salesByProduct([updated]);
    return forSeller(updated, sales.get(updated.productId));
  }

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
        deliveryVehicle: data.deliveryVehicle,
        images: data.images?.length ? { create: withPrimary(data.images) } : undefined,
      },
    });
    return tx.paymentLink.update({
      where: { id: link.id },
      data: { deliveryType, deliveryFee, isActive: data.isActive },
      include: { product: { include: LINK_PRODUCT_INCLUDE } },
    });
  });

  const sales = await salesByProduct([updated]);
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

// How many can still be bought: the link's own quantity, and - for a price
// agreed in chat on a listed product - what's left of that listing too.
const stockOf = (link: { product: { stock: number }; offer?: { product: { stock: number } | null } | null }) =>
  Math.min(link.product.stock, link.offer?.product?.stock ?? Infinity);

const availabilityOf = (link: {
  isActive: boolean;
  product: { stock: number };
  offer?: { product: { stock: number } | null } | null;
}): Availability => (!link.isActive ? "PAUSED" : stockOf(link) <= 0 ? "SOLD_OUT" : "AVAILABLE");

const PUBLIC_LINK_INCLUDE = {
  product: { include: LINK_PRODUCT_INCLUDE },
  // From an offer in chat on a listed product: that listing's stock.
  offer: { select: { product: { select: { id: true, title: true, stock: true } } } },
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      brandColor: true,
      city: true,
      state: true,
      address: true,
      isVerified: true,
      isSuspended: true,
      underReview: true,
      rating: true,
      paystackSubaccountCode: true,
      payoutAccountUpdatedAt: true,
      seller: { select: { userId: true } },
      shippingOptions: { where: { isArchived: false }, orderBy: { fee: "asc" } },
    },
  },
} satisfies Prisma.PaymentLinkInclude;

type PublicLink = Prisma.PaymentLinkGetPayload<{ include: typeof PUBLIC_LINK_INCLUDE }>;

// Zones / pickup points the buyer can choose for this item (its vehicle).
const usableOptions = (link: PublicLink) =>
  link.store.shippingOptions.filter((option) => canCarry(option, link.product.deliveryVehicle));

const findLiveLink = async (code: string) => {
  const link = await prisma.paymentLink.findUnique({ where: { code }, include: PUBLIC_LINK_INCLUDE });
  if (!link || link.isArchived || link.store.isSuspended) {
    throw new AppError("This payment link doesn't exist or has been removed.", 404);
  }
  // A listed product taken out of the shop (or given options) since.
  if (link.fromListing && listingProblem(link.product)) {
    throw new AppError("This item isn't available through this link anymore. Ask the seller for a new one.", 404);
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
    // Shared from the shop: the listing, for "See it in the shop".
    productId: link.fromListing ? product.id : null,
    quantityAvailable: Math.max(0, stockOf(link)),
    deliveryType: link.deliveryType,
    deliveryFee: link.deliveryFee,
    pickupAddress: link.deliveryType === PaymentLinkDelivery.PICKUP ? storePickupAddress(store) : null,
    deliveryVehicle: product.deliveryVehicle,
    // Shared from the shop with options: the buyer picks a combination.
    options: link.fromListing ? product.options.map(({ name, values, position }) => ({ name, values, position })) : [],
    variations: link.fromListing
      ? product.variations.map(({ id, option1, option2, price, stock, isActive }) => ({
          id,
          option1,
          option2,
          price,
          stock: Math.max(0, stock),
          isActive,
        }))
      : [],
    // STORE_OPTIONS: what the buyer chooses from, as at checkout.
    shippingOptions:
      link.deliveryType === PaymentLinkDelivery.STORE_OPTIONS
        ? usableOptions(link).map(({ id, name, fee, eta, type, areas, state, pickupAddress, vehicle }) => ({
            id,
            name,
            fee,
            eta,
            type,
            areas,
            state,
            pickupAddress,
            vehicle,
          }))
        : [],
    availability: availabilityOf(link),
    isOwner: !!viewerId && viewerId === store.seller.userId,
    // Made from an accepted offer in chat: only that buyer can pay it.
    reserved: !!link.buyerId,
    reservedForViewer: !!viewerId && viewerId === link.buyerId,
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      address: store.address,
      logo: store.logo,
      brandColor: store.brandColor,
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
  const [link, user, address] = await Promise.all([
    findLiveLink(code),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.address.findUnique({ where: { id: data.addressId } }),
  ]);

  if (!user) throw new AppError("User not found.", 404);
  if (!address || address.userId !== userId) throw new AppError("Address not found.", 404);

  assertCanBuy(link, userId, data.quantity ?? 1, data.variationId);
  return startLinkPayment(link, user, address, data);
};

/**
 * The combination (e.g. Size: L · Colour: Black) the buyer chose, for a
 * product shared from the shop with options - null for everything else.
 */
const chosenVariation = (link: PublicLink, variationId?: string) => {
  const variations = link.fromListing ? link.product.variations : [];
  if (!variations.length) return null;
  if (!variationId) {
    const names = link.product.options.map((option) => option.name.toLowerCase()).join(" and ");
    throw new AppError(`Choose the ${names || "option"} you want.`, 400);
  }
  const variation = variations.find((v) => v.id === variationId);
  if (!variation) throw new AppError("That option isn't available anymore. Choose another.", 400);
  if (!variation.isActive || variation.stock <= 0) {
    throw new AppError(`${variationLabel(link.product.options, variation)} is sold out. Choose another option.`, 400);
  }
  return variation;
};

// Before anything is created: the link can be paid, by this person, for this many.
const assertCanBuy = (link: PublicLink, userId: string | null, quantity: number, variationId?: string) => {
  // From an accepted offer in chat: the price was agreed with one buyer.
  if (link.buyerId && userId !== link.buyerId) {
    throw new AppError(
      userId
        ? "This link is for the buyer the price was agreed with in chat. Make your own offer to the seller."
        : "This price was agreed in a Nestly chat. Log in to the account that agreed it to pay.",
      403
    );
  }
  if (userId && link.store.seller.userId === userId) {
    throw new AppError("This is your own payment link - share it with your buyer.", 400);
  }
  const availability = availabilityOf(link);
  if (availability === "PAUSED") throw new AppError("The seller has paused this link. Message them to turn it back on.", 400);
  if (availability === "SOLD_OUT") throw new AppError("This item has sold out.", 400);
  if (quantity > stockOf(link)) {
    throw new AppError(`Only ${stockOf(link)} left - lower the quantity.`, 400);
  }
  const variation = chosenVariation(link, variationId);
  if (variation && quantity > variation.stock) {
    throw new AppError(`Only ${variation.stock} left in ${variationLabel(link.product.options, variation)} - lower the quantity.`, 400);
  }
};

/**
 * Creates the pending order and its Paystack transaction - shared by
 * logged-in buyers and guest checkout. `guestAccessToken` is set for
 * guests: it's the secret in their private tracking link.
 */
const startLinkPayment = async (
  link: PublicLink,
  user: User,
  address: { id: string; phone: string },
  data: Omit<PayPaymentLinkInput, "addressId">,
  guestAccessToken?: string
) => {
  const userId = user.id;
  const quantity = data.quantity ?? 1;
  const { store, product } = link;

  const fullProduct = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    include: { images: true, specifications: true, category: true },
  });

  const commissionRate = referralRewardApplies(user, { id: store.id, sellerUserId: store.seller.userId })
    ? referralCommission(fullProduct.category.commissionRate)
    : fullProduct.category.commissionRate;
  const referralReward = commissionRate !== fullProduct.category.commissionRate;

  // How it reaches the buyer: the fee agreed on the link, pickup, or the
  // store zone / pickup point the buyer chose.
  let shipping: {
    optionName: string;
    fee: number;
    eta: string | null;
    type: ShippingOptionType;
    pickupAddress: string | null;
    vehicle: ShippingOption["vehicle"];
  };
  if (link.deliveryType === PaymentLinkDelivery.STORE_OPTIONS) {
    if (!data.shippingOptionId) throw new AppError("Choose how you'd like to receive it.", 400);
    const option = store.shippingOptions.find((o) => o.id === data.shippingOptionId);
    if (!option) throw new AppError("That delivery option isn't available. Choose another.", 400);
    if (!canCarry(option, product.deliveryVehicle)) {
      throw new AppError(
        `"${option.name}" can't carry this item (it needs a ${VEHICLE_LABEL[product.deliveryVehicle]}). Choose another option.`,
        400
      );
    }
    const isOptionPickup = option.type === ShippingOptionType.PICKUP;
    shipping = {
      optionName: option.name,
      fee: option.fee,
      eta: option.eta,
      type: option.type,
      pickupAddress: isOptionPickup ? option.pickupAddress ?? storePickupAddress(store) : null,
      vehicle: isOptionPickup ? null : option.vehicle,
    };
  } else if (link.deliveryType === PaymentLinkDelivery.PICKUP) {
    shipping = {
      optionName: "Pickup",
      fee: 0,
      eta: null,
      type: ShippingOptionType.PICKUP,
      pickupAddress: storePickupAddress(store),
      vehicle: null,
    };
  } else {
    shipping = {
      optionName: "Delivery (agreed with seller)",
      fee: link.deliveryFee,
      eta: null,
      type: ShippingOptionType.DELIVERY,
      pickupAddress: null,
      vehicle: null,
    };
  }

  const variation = chosenVariation(link, data.variationId);
  const unitPrice = unitPriceOf(product, variation);
  const subtotal = unitPrice * quantity;
  const deliveryFee = shipping.fee;
  const total = subtotal + deliveryFee;
  assertWithinReviewLimit(store, total);
  const totalKobo = Math.round(total * NAIRA_TO_KOBO);

  // Seller's share (less commission, plus the delivery fee) goes straight
  // to their Paystack subaccount when they have one - same as cart orders -
  // unless hold-then-pay is on (utils/payoutMode).
  const paidViaSplit = routeViaSplit(store);
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

  // The unpaid order holds its stock while the buyer pays (utils/stockHold).
  const order = await prisma.$transaction(async (tx) => {
    // An offer on a listed product also holds that listing's stock, so the
    // last one can't be sold twice (once in the shop, once via the offer).
    const listed = link.offer?.product;
    await assertStockAvailable(tx, userId, [
      { productId: product.id, variationId: variation?.id ?? null, quantity, title: product.title },
      ...(listed ? [{ productId: listed.id, variationId: null, quantity, title: listed.title }] : []),
    ]);

    return tx.order.create({
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
        source: data.source,
        guestAccessToken,
        items: {
          create: {
            productId: product.id,
            quantity,
            unitPrice,
            variationId: variation?.id ?? null,
            variantLabel: variation ? variationLabel(product.options, variation) : null,
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
            ...shipping,
            deliveryCode: generateDeliveryCode(),
            paidViaSplit,
            heldForPayout: holdPayoutFor(store),
          },
        },
        sellerNotes: note ? { create: { storeId: store.id, note } } : undefined,
      },
    });
  }, STOCK_HOLD_TX);

  const paystack = await initializePaystackTransaction({
    email: user.email,
    amountKobo: totalKobo,
    reference,
    callbackUrl: process.env.FRONTEND_URL
      ? guestAccessToken
        ? guestOrderUrl(guestAccessToken)
        : `${process.env.FRONTEND_URL}/marketplace/orders`
      : undefined,
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

// ---------------------------------------------------------------------------
// Guest checkout
//
// Someone who came from a seller's Instagram or WhatsApp can pay without
// making an account first. Behind the scenes they get a guest account (no
// password) so the order works exactly like any other - stock holds,
// delivery code, seller notified, payouts, returns. They follow the order
// through a private tracking link (/orders/track/{token}), sent by email
// too, and can turn the guest account into a full one by setting a
// password (or continuing with Google).
// ---------------------------------------------------------------------------

/** Starts paying through a link without logging in. */
export const guestPayPaymentLinkService = async (code: string, data: GuestPayPaymentLinkInput) => {
  const link = await findLiveLink(code);
  const quantity = data.quantity ?? 1;

  if (link.deliveryType === PaymentLinkDelivery.STORE_OPTIONS && !data.shippingOptionId) {
    throw new AppError("Choose how you'd like to receive it.", 400);
  }
  // Pickup needs no address; everything else needs somewhere to deliver.
  const isPickup =
    link.deliveryType === PaymentLinkDelivery.PICKUP ||
    (link.deliveryType === PaymentLinkDelivery.STORE_OPTIONS &&
      link.store.shippingOptions.find((option) => option.id === data.shippingOptionId)?.type === ShippingOptionType.PICKUP);
  if (!isPickup && (!data.address || !data.city || !data.state)) {
    throw new AppError("Enter the address, city and state to deliver to.", 400);
  }

  assertCanBuy(link, null, quantity, data.variationId);
  const user = await guestAccountFor(data);
  assertCanBuy(link, user.id, quantity, data.variationId);

  const address = await prisma.address.create({
    data: {
      userId: user.id,
      fullName: data.name,
      phone: data.phone,
      address: isPickup ? data.address || "Pickup" : data.address!,
      city: isPickup ? data.city || link.store.city || "-" : data.city!,
      state: isPickup ? data.state || link.store.state || "-" : data.state!,
      country: "Nigeria",
    },
  });

  const token = generateGuestToken();
  const payment = await startLinkPayment(
    link,
    user,
    address,
    {
      quantity,
      shippingOptionId: data.shippingOptionId,
      variationId: data.variationId,
      deliveryPhone: data.phone,
      note: data.note,
      source: data.source,
    },
    token
  );

  return { ...payment, guestToken: token };
};

const GUEST_ORDER_INCLUDE = {
  user: { select: { id: true, name: true, email: true, isGuest: true, guestDeclinedAt: true } },
  paymentLink: {
    select: {
      code: true,
      store: { select: { name: true, slug: true, logo: true, isVerified: true, seller: { select: { userId: true } } } },
    },
  },
} satisfies Prisma.OrderInclude;

const findGuestOrder = async (token: string) => {
  const order = await prisma.order.findUnique({ where: { guestAccessToken: token }, include: GUEST_ORDER_INCLUDE });
  if (!order) throw new AppError("We couldn't find this order. Check the link in your email.", 404);
  return order;
};

// "s***a@gmail.com" - enough to recognise, not enough to harvest.
const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name[0]}${name.length > 2 ? "***" : "*"}${name.length > 1 ? name[name.length - 1] : ""}@${domain}`;
};

/**
 * The guest's order, as their order page shows it (items, delivery code,
 * timeline), plus whether they can still turn it into a full account.
 */
export const getGuestOrderService = async (token: string) => {
  const order = await findGuestOrder(token);
  const details = await getCustomerOrderByIdService(order.userId, order.id);
  const store = order.paymentLink?.store;

  return {
    ...details,
    store: store
      ? { name: store.name, slug: store.slug, logo: store.logo, isVerified: store.isVerified, sellerUserId: store.seller.userId }
      : null,
    paymentLinkCode: order.paymentLink?.code ?? null,
    buyer: {
      name: order.user.name,
      email: maskEmail(order.user.email),
      // False once they've set a password / used Google - then the order is
      // also under "My orders" when they log in.
      isGuest: order.user.isGuest,
      // Said "No thanks" to the account offer - don't ask again on this page.
      declinedAccount: !!order.user.guestDeclinedAt,
    },
  };
};

/** "No thanks" to making an account, from the order page. */
export const declineGuestAccountForOrderService = async (token: string) => {
  const order = await findGuestOrder(token);
  await declineGuestAccountService(order.userId);
};

/** After the Paystack popup: confirm the payment for this guest order. */
export const verifyGuestOrderService = async (token: string) => {
  const order = await findGuestOrder(token);
  if (!order.paymentReference) throw new AppError("This order has no payment to confirm.", 400);
  await confirmPaymentByReferenceService(order.paymentReference);
  return getGuestOrderService(token);
};

/** The guest confirms an item the seller marked delivered arrived. */
export const confirmGuestDeliveryService = async (token: string, orderItemId: string) => {
  const order = await findGuestOrder(token);
  const item = await prisma.orderItem.findUnique({ where: { id: orderItemId }, select: { orderId: true } });
  if (!item || item.orderId !== order.id) throw new AppError("Order item not found.", 404);
  await confirmDeliveryService(order.userId, orderItemId);
  return getGuestOrderService(token);
};

/**
 * Turns the guest account into a full one with a password, straight from
 * the tracking page - when this order is the only thing on the account.
 * If the account has other orders, whoever holds this link may not be the
 * person behind them (anyone can type an email at checkout), so the
 * password link goes to the email instead.
 */
export const claimGuestAccountService = async (token: string, password: string) => {
  const order = await findGuestOrder(token);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: order.userId } });

  if (!user.isGuest) {
    throw new AppError("This order already belongs to a Nestly account. Log in to see it.", 400);
  }

  const otherOrders = await prisma.order.count({ where: { userId: user.id, id: { not: order.id } } });
  if (otherOrders > 0) {
    await forgotPasswordService(user.email);
    return { emailSent: true as const, email: maskEmail(user.email) };
  }

  const verificationToken = generateVerificationToken();
  const claimed = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(password, 10),
      isGuest: false,
      guestJoinedAt: new Date(),
      // They typed this email at checkout - it still needs confirming, as at signup.
      verificationToken,
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  sendEmail(
    claimed.email,
    "Verify your account",
    verificationTemplate(claimed.name, `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`)
  ).catch(console.error);

  return { emailSent: false as const, user: claimed };
};
