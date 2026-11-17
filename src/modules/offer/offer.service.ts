import { DeliveryVehicle, OfferStatus, PaymentLinkDelivery, ProductStatus, SellerStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { assertWithinReviewLimit } from "../../utils/sellerReview";
import { isBlockedEitherWay } from "../block/block.service";
import { broadcastOfferUpdate, postOfferMessage } from "../conversation/conversation.service";
import { createNotificationService } from "../notification/notification.service";
import { createPaymentLinkService } from "../payment-link/payment-link.service";
import { CreateOfferInput, RespondOfferInput } from "./offer.validation";

// Make an offer in chat. The buyer offers a price; the seller accepts,
// counters or declines; either side can accept the other's counter. An
// accepted offer becomes a payment link reserved for that buyer - the deal
// goes from "how much last?" in DMs to a protected payment in the same chat.

const OFFER_TTL_MS = 48 * 60 * 60 * 1000;

const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

const notify = (userId: string, title: string, message: string, conversationId: string) =>
  createNotificationService(userId, title, message, undefined, { type: "CONVERSATION", id: conversationId }).catch((error) =>
    console.error("Offer notification failed:", error)
  );

const isExpired = (offer: { expiresAt: Date }) => offer.expiresAt.getTime() <= Date.now();

/** Starts (or replaces) the buyer's offer in a chat with a seller. Returns the offer card message. */
export const createOfferService = async (userId: string, data: CreateOfferInput) => {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId: data.conversationId },
    select: { userId: true },
  });
  if (!participants.some((p) => p.userId === userId)) throw new AppError("Conversation not found.", 404);
  const other = participants.find((p) => p.userId !== userId);
  if (!other || participants.length !== 2) throw new AppError("Offers work in one-to-one chats with a seller.", 400);

  const store = await prisma.store.findFirst({
    where: { seller: { userId: other.userId, status: SellerStatus.APPROVED } },
    select: { id: true, name: true, isSuspended: true, underReview: true },
  });
  if (!store || store.isSuspended) throw new AppError("You can only make offers to a seller on Nestly.", 400);
  if (await isBlockedEitherWay(userId, other.userId)) throw new AppError("You cannot message this user.", 403);

  const quantity = data.quantity ?? 1;
  let title = data.title?.trim() ?? "";
  let categoryId: string | null = null;
  if (data.productId) {
    const product = await prisma.product.findFirst({
      where: { id: data.productId, storeId: store.id, status: ProductStatus.PUBLISHED },
      select: { title: true, categoryId: true, stock: true },
    });
    if (!product) throw new AppError("That product isn't available from this seller.", 404);
    if (product.stock < quantity) {
      throw new AppError(product.stock > 0 ? `Only ${product.stock} left - lower the quantity.` : "This product is sold out.", 400);
    }
    title = product.title;
    categoryId = product.categoryId;
  }
  assertWithinReviewLimit(store, data.price * quantity);

  // One open offer per buyer per chat: a new one replaces the last.
  const replaced = await prisma.offer.findMany({
    where: { conversationId: data.conversationId, buyerId: userId, status: OfferStatus.PENDING },
    select: { id: true },
  });
  if (replaced.length) {
    await prisma.offer.updateMany({
      where: { id: { in: replaced.map((o) => o.id) }, status: OfferStatus.PENDING },
      data: { status: OfferStatus.WITHDRAWN, respondedAt: new Date() },
    });
  }

  const offer = await prisma.offer.create({
    data: {
      conversationId: data.conversationId,
      storeId: store.id,
      buyerId: userId,
      createdById: userId,
      productId: data.productId ?? null,
      title,
      price: data.price,
      quantity,
      note: data.note || null,
      categoryId,
      expiresAt: new Date(Date.now() + OFFER_TTL_MS),
    },
  });

  for (const old of replaced) await broadcastOfferUpdate(old.id);
  const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return postOfferMessage(
    userId,
    data.conversationId,
    offer.id,
    `${buyer?.name ?? "A buyer"} offered ${naira(data.price)}${quantity > 1 ? ` each (×${quantity})` : ""} for "${title}".`
  );
};

const OFFER_INCLUDE = {
  store: { select: { id: true, name: true, underReview: true, seller: { select: { userId: true } } } },
  product: { select: { deliveryVehicle: true, images: { select: { url: true, isPrimary: true } } } },
} as const;

const findOpenOffer = async (offerId: string, userId: string) => {
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: OFFER_INCLUDE });
  if (!offer) throw new AppError("Offer not found.", 404);
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: offer.conversationId, userId } },
    select: { id: true },
  });
  if (!isParticipant) throw new AppError("Offer not found.", 404);
  return offer;
};

/**
 * Claims a pending offer for an answer: only one answer wins (two taps, two
 * devices). Expired offers can't be answered.
 */
const claim = async (offer: { id: string; status: OfferStatus; expiresAt: Date }, status: OfferStatus) => {
  if (offer.status !== OfferStatus.PENDING) throw new AppError("This offer has already been answered.", 409);
  if (isExpired(offer)) throw new AppError("This offer has expired. Make a new one.", 400);
  const { count } = await prisma.offer.updateMany({
    where: { id: offer.id, status: OfferStatus.PENDING },
    data: { status, respondedAt: new Date() },
  });
  if (count === 0) throw new AppError("This offer has already been answered.", 409);
};

/** Accept, counter or decline an offer the other side made. */
export const respondOfferService = async (userId: string, offerId: string, data: RespondOfferInput) => {
  const offer = await findOpenOffer(offerId, userId);
  if (offer.createdById === userId) throw new AppError("You can't answer your own offer - wait for the other side.", 400);

  const sellerUserId = offer.store.seller.userId;
  const isSeller = userId === sellerUserId;
  const otherSide = isSeller ? offer.buyerId : sellerUserId;

  if (data.action === "DECLINE") {
    await claim(offer, OfferStatus.DECLINED);
    await broadcastOfferUpdate(offer.id);
    notify(otherSide, "Offer declined", `Your offer of ${naira(offer.price)} for "${offer.title}" was declined.`, offer.conversationId);
    return { status: OfferStatus.DECLINED };
  }

  // A described item needs a category (it sets the commission) - the seller
  // picks it when they first set a price.
  const categoryId = offer.categoryId ?? (isSeller ? data.categoryId ?? null : null);
  if (isSeller && !categoryId) throw new AppError("Choose a category for this item.", 400);
  if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    throw new AppError("Category not found.", 404);
  }
  const zones = await prisma.shippingOption.count({ where: { storeId: offer.storeId, isArchived: false } });
  const deliveryFee = zones > 0 ? null : offer.deliveryFee ?? (isSeller ? data.deliveryFee ?? 0 : 0);

  if (data.action === "COUNTER") {
    const price = data.price!;
    assertWithinReviewLimit(offer.store, price * offer.quantity, isSeller);
    await claim(offer, OfferStatus.COUNTERED);
    const counter = await prisma.offer.create({
      data: {
        conversationId: offer.conversationId,
        storeId: offer.storeId,
        buyerId: offer.buyerId,
        createdById: userId,
        productId: offer.productId,
        title: offer.title,
        price,
        quantity: offer.quantity,
        note: data.note || null,
        categoryId,
        deliveryFee,
        counterOfId: offer.id,
        expiresAt: new Date(Date.now() + OFFER_TTL_MS),
      },
    });
    await broadcastOfferUpdate(offer.id);
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return postOfferMessage(
      userId,
      offer.conversationId,
      counter.id,
      `${me?.name ?? "They"} countered with ${naira(price)} for "${offer.title}".`
    );
  }

  // ACCEPT: the agreed price becomes a payment link only this buyer can pay.
  if (!categoryId) throw new AppError("The seller needs to set a category first - ask them to send a counter-offer.", 400);
  await claim(offer, OfferStatus.ACCEPTED);
  try {
    const link = await createPaymentLinkService(sellerUserId, {
      title: offer.title,
      description: `Price agreed in chat${offer.note ? ` - ${offer.note}` : ""}.`,
      price: offer.price,
      quantity: offer.quantity,
      categoryId,
      deliveryType: zones > 0 ? PaymentLinkDelivery.STORE_OPTIONS : PaymentLinkDelivery.DELIVERY,
      deliveryFee: deliveryFee ?? 0,
      deliveryVehicle: offer.product?.deliveryVehicle ?? DeliveryVehicle.BIKE,
      images: offer.product?.images.slice(0, 6).map(({ url, isPrimary }) => ({ url, isPrimary })),
    });
    await prisma.$transaction([
      prisma.paymentLink.update({ where: { id: link.id }, data: { buyerId: offer.buyerId } }),
      prisma.offer.update({ where: { id: offer.id }, data: { paymentLinkId: link.id, deliveryFee } }),
    ]);
  } catch (error) {
    // Couldn't make the link (e.g. the store was suspended meanwhile): the
    // offer goes back to waiting so nobody is told it was accepted.
    await prisma.offer.update({ where: { id: offer.id }, data: { status: OfferStatus.PENDING, respondedAt: null } });
    throw error;
  }

  await broadcastOfferUpdate(offer.id);
  const total = offer.price * offer.quantity + (deliveryFee ?? 0);
  if (isSeller) {
    notify(offer.buyerId, "Offer accepted 🎉", `${offer.store.name} accepted ${naira(offer.price)} for "${offer.title}". Tap to pay ${naira(total)} securely.`, offer.conversationId);
  } else {
    notify(sellerUserId, "Offer accepted", `The buyer accepted ${naira(offer.price)} for "${offer.title}". You'll be told when they pay.`, offer.conversationId);
  }
  return { status: OfferStatus.ACCEPTED };
};

/** The person who made an offer takes it back (while it's still waiting). */
export const withdrawOfferService = async (userId: string, offerId: string) => {
  const offer = await findOpenOffer(offerId, userId);
  if (offer.createdById !== userId) throw new AppError("Only the person who made an offer can take it back.", 403);
  await claim({ ...offer, expiresAt: new Date(Date.now() + 1000) }, OfferStatus.WITHDRAWN);
  await broadcastOfferUpdate(offer.id);
  return { status: OfferStatus.WITHDRAWN };
};
