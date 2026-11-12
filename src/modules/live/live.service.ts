import crypto from "crypto";
import {
  LiveStatus,
  OrderStatus,
  Prisma,
  ProductStatus,
  ShippingOptionType,
  UserStatus,
} from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { isAdminUser } from "../../utils/isAdmin";
import { hideContacts } from "../../utils/contactFilter";
import { READINESS_SELECT, READINESS_STEPS, missingSetup } from "../../utils/sellerReadiness";
import { closeLiveRoom, createJoinToken, liveVideoConfigured } from "../../utils/livekit";
import { initializePaystackTransaction } from "../../utils/paystack";
import { snapshotOf } from "../../utils/orderItemSnapshot";
import { generateReferralCode, referralCommission, referralRewardApplies } from "../../utils/referral";
import { STOCK_HOLD_TX, assertStockAvailable } from "../../utils/stockHold";
import { holdPayoutsEnabled, routeViaSplit } from "../../utils/payoutMode";
import { OPTIONS_INCLUDE, unitPriceOf, variationLabel } from "../../utils/productOptions";
import { VEHICLE_LABEL, canCarry } from "../../utils/deliveryVehicle";
import { emitToLive, liveViewerCount } from "../../socket/live-emitter";
import { getSellerStore } from "../seller/seller.utils";
import { storePickupAddress } from "../store/store.service";
import { generateDeliveryCode } from "../order/order-delivery";
import { paystackSplitFor } from "../checkout/checkout.service";
import { notifyLiveCancelled, notifyLiveRescheduled, notifyLiveStarted } from "./live-notifications";
import { BuyFromLiveInput, CreateLiveInput, LIVE_CHAT_MAX, LIVE_MAX_PRODUCTS, LIVE_SCHEDULE_MAX_DAYS, UpdateLiveInput } from "./live.validation";

// Live selling. A seller with a fully set-up store schedules a live (or
// goes live now) and shares /live/{code}. Anyone can open the link; people
// tap "Remind me" (sign-up needed) and are reminded before it starts. During
// the live, viewers watch (LiveKit), chat (socket/live.ts) and buy the
// featured products without leaving - at a live-only discount if the seller
// set one. Orders are normal orders (delivery code, buyer protection,
// payouts), tagged with the live for the seller's summary.

const MINUTE = 60 * 1000;
const NAIRA_TO_KOBO = 100;

/** A live ends by itself after this long (keeps video costs predictable). */
export const LIVE_MAX_MINUTES = 60;
/** Live discounts still apply this long after the live ends. */
export const LIVE_DISCOUNT_GRACE_MINUTES = 30;
/** How early a seller can start before the advertised time. */
export const LIVE_EARLY_START_MINUTES = 60;
const MAX_UPCOMING_PER_STORE = 5;
// A start time this far in the past is treated as "go live now".
const NOW_TOLERANCE_MS = 10 * MINUTE;
const CHAT_HISTORY = 60;

const PAID_ORDER_STATUSES = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

// No 0/O, 1/l/I - codes get read out and typed.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

const uniqueCode = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from(crypto.randomBytes(CODE_LENGTH), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
    if (!(await prisma.liveSession.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
  throw new AppError("Couldn't create the live right now. Please try again.", 500);
};

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

const STORE_SELECT = {
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
  referralCode: true,
  seller: { select: { userId: true } },
} satisfies Prisma.StoreSelect;

const LIVE_INCLUDE = {
  store: { select: STORE_SELECT },
  products: {
    orderBy: { position: "asc" },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          title: true,
          price: true,
          stock: true,
          status: true,
          storeId: true,
          images: { orderBy: [{ isPrimary: "desc" }, { id: "asc" }], take: 1, select: { url: true } },
          variations: { where: { isArchived: false, isActive: true }, select: { price: true, stock: true } },
        },
      },
    },
  },
  _count: { select: { interests: true } },
} satisfies Prisma.LiveSessionInclude;

type LiveWithDetails = Prisma.LiveSessionGetPayload<{ include: typeof LIVE_INCLUDE }>;

/** Live discounts apply during the live and for a short while after. */
export const discountActive = (live: { status: LiveStatus; endedAt: Date | null }, now = new Date()) =>
  live.status === LiveStatus.LIVE ||
  (live.status === LiveStatus.ENDED && !!live.endedAt && now.getTime() - live.endedAt.getTime() < LIVE_DISCOUNT_GRACE_MINUTES * MINUTE);

export const applyDiscount = (price: number, percent: number | null | undefined) =>
  percent ? Math.round(price * (1 - percent / 100)) : price;

const productView = (item: LiveWithDetails["products"][number], discounted: boolean) => {
  const { product } = item;
  const prices = product.variations.length
    ? product.variations.map((variation) => variation.price ?? product.price)
    : [product.price];
  const from = Math.min(...prices);
  const to = Math.max(...prices);
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    image: product.images[0]?.url ?? null,
    price: from,
    maxPrice: to,
    discountPercent: item.discountPercent,
    // What it costs right now through the live (null = no live price now).
    livePrice: discounted && item.discountPercent ? applyDiscount(from, item.discountPercent) : null,
    hasOptions: product.variations.length > 0,
    stock: Math.max(0, product.stock),
    available: product.status === ProductStatus.PUBLISHED && product.stock > 0,
  };
};

const storeView = (store: LiveWithDetails["store"]) => ({
  id: store.id,
  name: store.name,
  slug: store.slug,
  logo: store.logo,
  city: store.city,
  state: store.state,
  isVerified: store.isVerified,
  rating: store.rating,
  sellerUserId: store.seller.userId,
});

const baseView = (live: LiveWithDetails, now = new Date()) => {
  const discounted = discountActive(live, now);
  return {
    id: live.id,
    code: live.code,
    title: live.title,
    description: live.description,
    coverImage: live.coverImage,
    scheduledAt: live.scheduledAt,
    startedAt: live.startedAt,
    endedAt: live.endedAt,
    status: live.status,
    endReason: live.endReason,
    pinnedProductId: live.pinnedProductId,
    discountActive: discounted,
    // When the live ends by itself (LIVE only).
    endsAt: live.startedAt && live.status === LiveStatus.LIVE ? new Date(live.startedAt.getTime() + LIVE_MAX_MINUTES * MINUTE) : null,
    interestedCount: live._count.interests,
    viewers: live.status === LiveStatus.LIVE ? liveViewerCount(live.id) : 0,
    store: storeView(live.store),
    products: live.products.map((item) => productView(item, discounted)),
  };
};

const messageView = (
  message: { id: string; text: string; createdAt: Date; user: { id: string; name: string; avatar: string | null } },
  sellerUserId: string
) => ({
  id: message.id,
  text: message.text,
  createdAt: message.createdAt,
  user: { id: message.user.id, name: message.user.name, avatar: message.user.avatar },
  isSeller: message.user.id === sellerUserId,
});

const findLiveByCode = async (code: string) => {
  const live = await prisma.liveSession.findUnique({ where: { code }, include: LIVE_INCLUDE });
  if (!live || live.store.isSuspended) throw new AppError("This live doesn't exist or has been removed.", 404);
  return live;
};

const getOwnedLive = async (userId: string, id: string) => {
  const live = await prisma.liveSession.findUnique({ where: { id }, include: LIVE_INCLUDE });
  if (!live || live.store.seller.userId !== userId) throw new AppError("Live not found.", 404);
  return live;
};

// ---------------------------------------------------------------------------
// Seller: eligibility, scheduling
// ---------------------------------------------------------------------------

/** What's stopping this seller from going live (empty = nothing). */
const liveBlockers = async (userId: string) => {
  const seller = await prisma.sellerProfile.findUnique({ where: { userId }, select: READINESS_SELECT });
  if (!seller) return READINESS_STEPS.map((step) => step.title);
  const missing = missingSetup(seller);
  return READINESS_STEPS.filter((step) => missing.includes(step.key)).map((step) => step.title);
};

const getEligibleStore = async (userId: string) => {
  const store = await getSellerStore(userId);
  if (store.isSuspended) throw new AppError("Your store is suspended, so you can't go live right now.", 403);
  const blockers = await liveBlockers(userId);
  if (blockers.length) {
    throw new AppError(`Finish setting up your store before going live: ${blockers.join(", ").toLowerCase()}.`, 403);
  }
  return store;
};

const assertProductsInStore = async (storeId: string, productIds: string[]) => {
  const found = await prisma.product.count({
    where: { id: { in: productIds }, storeId, status: { in: [ProductStatus.PUBLISHED, ProductStatus.OUT_OF_STOCK] } },
  });
  if (found !== productIds.length) {
    throw new AppError("Some of those products aren't published in your store any more. Choose them again.", 400);
  }
};

const resolveStart = (scheduledAt: Date, now = new Date()) => {
  if (scheduledAt.getTime() < now.getTime() - NOW_TOLERANCE_MS) throw new AppError("Pick a time in the future.", 400);
  if (scheduledAt.getTime() > now.getTime() + LIVE_SCHEDULE_MAX_DAYS * 24 * 60 * MINUTE) {
    throw new AppError(`You can schedule a live up to ${LIVE_SCHEDULE_MAX_DAYS} days ahead.`, 400);
  }
  return scheduledAt.getTime() < now.getTime() ? now : scheduledAt;
};

// Paid orders and sales per live - one query for any number of lives.
const salesFor = async (liveIds: string[]) => {
  const rows = liveIds.length
    ? await prisma.order.groupBy({
        by: ["liveSessionId"],
        where: { liveSessionId: { in: liveIds }, status: { in: PAID_ORDER_STATUSES } },
        _count: { _all: true },
        _sum: { subtotal: true },
      })
    : [];
  return new Map(rows.map((row) => [row.liveSessionId as string, { orders: row._count._all, revenue: row._sum.subtotal ?? 0 }]));
};

const sellerViewWith = (live: LiveWithDetails, sales?: { orders: number; revenue: number }) => ({
  ...baseView(live),
  // So links the seller shares count sign-ups for their store.
  referralCode: live.store.referralCode,
  orders: sales?.orders ?? 0,
  revenue: sales?.revenue ?? 0,
});

const sellerView = async (live: LiveWithDetails) => sellerViewWith(live, (await salesFor([live.id])).get(live.id));

// Live links carry the store's referral code. Stores created before
// referrals existed get theirs here (as the share kit does).
const ensureReferralCode = async (store: { id: string; referralCode: string | null }) => {
  if (!store.referralCode) {
    await prisma.store.update({ where: { id: store.id }, data: { referralCode: await generateReferralCode() } });
  }
};

export const getMyLivesService = async (userId: string) => {
  const store = await getSellerStore(userId);
  await ensureReferralCode(store);
  const [lives, blockers] = await Promise.all([
    prisma.liveSession.findMany({ where: { storeId: store.id }, orderBy: { scheduledAt: "desc" }, take: 50, include: LIVE_INCLUDE }),
    liveBlockers(userId),
  ]);
  const sales = await salesFor(lives.map((live) => live.id));
  return {
    canGoLive: blockers.length === 0 && !store.isSuspended,
    blockers,
    videoReady: liveVideoConfigured(),
    maxMinutes: LIVE_MAX_MINUTES,
    lives: lives.map((live) => sellerViewWith(live, sales.get(live.id))),
  };
};

export const createLiveService = async (userId: string, data: CreateLiveInput) => {
  const store = await getEligibleStore(userId);
  await ensureReferralCode(store);
  const scheduledAt = resolveStart(data.scheduledAt);

  const upcoming = await prisma.liveSession.count({ where: { storeId: store.id, status: LiveStatus.SCHEDULED } });
  if (upcoming >= MAX_UPCOMING_PER_STORE) {
    throw new AppError(`You can have up to ${MAX_UPCOMING_PER_STORE} upcoming lives. Cancel one or wait until one has happened.`, 400);
  }
  await assertProductsInStore(store.id, data.products.map((item) => item.productId));

  const live = await prisma.liveSession.create({
    data: {
      code: await uniqueCode(),
      storeId: store.id,
      title: data.title,
      description: data.description || null,
      coverImage: data.coverImage || null,
      scheduledAt,
      products: {
        create: data.products.map((item, position) => ({
          productId: item.productId,
          discountPercent: item.discountPercent ?? null,
          position,
        })),
      },
    },
    include: LIVE_INCLUDE,
  });
  return sellerView(live);
};

export const updateLiveService = async (userId: string, id: string, data: UpdateLiveInput) => {
  const live = await getOwnedLive(userId, id);
  if (live.status !== LiveStatus.SCHEDULED) throw new AppError("You can only edit a live before it starts.", 400);

  const scheduledAt = data.scheduledAt ? resolveStart(data.scheduledAt) : undefined;
  const moved = !!scheduledAt && Math.abs(scheduledAt.getTime() - live.scheduledAt.getTime()) >= MINUTE;
  if (data.products) await assertProductsInStore(live.storeId, data.products.map((item) => item.productId));

  const updated = await prisma.$transaction(async (tx) => {
    if (data.products) {
      await tx.liveProduct.deleteMany({ where: { liveSessionId: id } });
      await tx.liveProduct.createMany({
        data: data.products.map((item, position) => ({
          liveSessionId: id,
          productId: item.productId,
          discountPercent: item.discountPercent ?? null,
          position,
        })),
      });
    }
    return tx.liveSession.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description === undefined ? undefined : data.description || null,
        coverImage: data.coverImage === undefined ? undefined : data.coverImage || null,
        ...(moved
          ? { scheduledAt, dayReminderSentAt: null, soonReminderSentAt: null, hostReminderSentAt: null }
          : {}),
      },
      include: LIVE_INCLUDE,
    });
  });

  if (moved) notifyLiveRescheduled(id).catch((error) => console.error("Live reschedule notice failed:", error));
  return sellerView(updated);
};

export const cancelLiveService = async (userId: string, id: string) => {
  const live = await getOwnedLive(userId, id);
  if (live.status !== LiveStatus.SCHEDULED) throw new AppError("Only an upcoming live can be cancelled.", 400);

  const claimed = await prisma.liveSession.updateMany({
    where: { id, status: LiveStatus.SCHEDULED },
    data: { status: LiveStatus.CANCELLED, endReason: "CANCELLED_BY_SELLER" },
  });
  if (claimed.count) {
    emitToLive(id, "live:status", { status: LiveStatus.CANCELLED });
    notifyLiveCancelled(id).catch((error) => console.error("Live cancel notice failed:", error));
  }
  return sellerView(await getOwnedLive(userId, id));
};

// ---------------------------------------------------------------------------
// Going live / ending
// ---------------------------------------------------------------------------

const hostToken = (live: LiveWithDetails) =>
  createJoinToken({ liveId: live.id, identity: `seller_${live.store.seller.userId}`, name: live.store.name, canPublish: true });

export const startLiveService = async (userId: string, id: string) => {
  const live = await getOwnedLive(userId, id);
  await getEligibleStore(userId);
  if (!liveVideoConfigured()) throw new AppError("Live video isn't set up yet. Please try again later.", 503);

  if (live.status === LiveStatus.LIVE) return { live: await sellerView(live), video: await hostToken(live) };
  if (live.status !== LiveStatus.SCHEDULED) throw new AppError("This live has already ended.", 400);

  const now = new Date();
  if (live.scheduledAt.getTime() - now.getTime() > LIVE_EARLY_START_MINUTES * MINUTE) {
    throw new AppError(`You can go live from ${LIVE_EARLY_START_MINUTES} minutes before the start time.`, 400);
  }
  const other = await prisma.liveSession.findFirst({
    where: { storeId: live.storeId, status: LiveStatus.LIVE, id: { not: id } },
    select: { title: true },
  });
  if (other) throw new AppError(`You're already live with "${other.title}". End it first.`, 400);

  const claimed = await prisma.liveSession.updateMany({
    where: { id, status: LiveStatus.SCHEDULED },
    data: { status: LiveStatus.LIVE, startedAt: now },
  });
  const started = await getOwnedLive(userId, id);
  if (claimed.count) {
    emitToLive(id, "live:status", { status: LiveStatus.LIVE, startedAt: now });
    notifyLiveStarted(id).catch((error) => console.error("Live started notice failed:", error));
  }
  return { live: await sellerView(started), video: await hostToken(started) };
};

/** Reconnecting to a live that's already running (page refresh, network drop). */
export const getHostTokenService = async (userId: string, id: string) => {
  const live = await getOwnedLive(userId, id);
  if (live.status !== LiveStatus.LIVE) throw new AppError("This live isn't running.", 400);
  return { live: await sellerView(live), video: await hostToken(live) };
};

/** Ends a running live. Used by the seller, admins and the time limit. */
export const endLive = async (id: string, reason: string) => {
  const ended = await prisma.liveSession.updateMany({
    where: { id, status: LiveStatus.LIVE },
    data: { status: LiveStatus.ENDED, endedAt: new Date(), pinnedProductId: null, endReason: reason },
  });
  if (ended.count) {
    emitToLive(id, "live:status", { status: LiveStatus.ENDED, reason });
    await closeLiveRoom(id);
  }
  return ended.count > 0;
};

export const endLiveService = async (userId: string, id: string) => {
  const admin = await isAdminUser(userId);
  const live = await prisma.liveSession.findUnique({ where: { id }, include: { store: { select: { seller: { select: { userId: true } } } } } });
  if (!live || (!admin && live.store.seller.userId !== userId)) throw new AppError("Live not found.", 404);
  if (live.status !== LiveStatus.LIVE) throw new AppError("This live isn't running.", 400);

  const isOwner = live.store.seller.userId === userId;
  await endLive(id, isOwner ? "ENDED_BY_SELLER" : "ENDED_BY_ADMIN");
  return { id, status: LiveStatus.ENDED };
};

// ---------------------------------------------------------------------------
// During the live (seller controls)
// ---------------------------------------------------------------------------

export const pinProductService = async (userId: string, id: string, productId: string | null) => {
  const live = await getOwnedLive(userId, id);
  if (live.status !== LiveStatus.LIVE) throw new AppError("You can pin products while you're live.", 400);
  // Showing something from the store that wasn't picked for this live:
  // add it (at its normal price) so everyone can see and buy it.
  let added = false;
  if (productId && !live.products.some((item) => item.productId === productId)) {
    if (live.products.length >= LIVE_MAX_PRODUCTS) throw new AppError(`A live can show up to ${LIVE_MAX_PRODUCTS} products.`, 400);
    const product = await prisma.product.findFirst({ where: { id: productId, storeId: live.storeId, status: ProductStatus.PUBLISHED }, select: { id: true } });
    if (!product) throw new AppError("That product isn't available in your store.", 400);
    const position = live.products.reduce((max, item) => Math.max(max, item.position), -1) + 1;
    await prisma.liveProduct.create({ data: { liveSessionId: id, productId, position } });
    added = true;
  }
  await prisma.liveSession.update({ where: { id }, data: { pinnedProductId: productId } });
  if (added) {
    const updated = await getOwnedLive(userId, id);
    const discounted = discountActive(updated);
    emitToLive(id, "live:products", { products: updated.products.map((item) => productView(item, discounted)) });
  }
  emitToLive(id, "live:pinned", { productId });
  return { pinnedProductId: productId, added };
};

export const removeMessageService = async (userId: string, id: string, messageId: string) => {
  await getOwnedLive(userId, id);
  const removed = await prisma.liveMessage.updateMany({ where: { id: messageId, liveSessionId: id }, data: { isRemoved: true } });
  if (!removed.count) throw new AppError("Message not found.", 404);
  emitToLive(id, "live:message-removed", { id: messageId });
  return { id: messageId };
};

export const banViewerService = async (userId: string, id: string, bannedUserId: string) => {
  await getOwnedLive(userId, id);
  if (bannedUserId === userId) throw new AppError("You can't block yourself.", 400);
  await prisma.liveBan.upsert({
    where: { liveSessionId_userId: { liveSessionId: id, userId: bannedUserId } },
    create: { liveSessionId: id, userId: bannedUserId },
    update: {},
  });
  // Their messages disappear for everyone, and their chat box closes.
  const messages = await prisma.liveMessage.findMany({ where: { liveSessionId: id, userId: bannedUserId, isRemoved: false }, select: { id: true } });
  await prisma.liveMessage.updateMany({ where: { liveSessionId: id, userId: bannedUserId }, data: { isRemoved: true } });
  messages.forEach((message) => emitToLive(id, "live:message-removed", { id: message.id }));
  emitToLive(id, "live:banned", { userId: bannedUserId });
  return { userId: bannedUserId };
};

/** A chat message from a signed-in viewer (called by socket/live.ts). */
export const sendLiveChatService = async (userId: string, liveId: string, rawText: string) => {
  const text = rawText.replace(/\s+/g, " ").trim().slice(0, LIVE_CHAT_MAX);
  if (!text) throw new AppError("Type a message first.", 400);

  const [live, user, ban] = await Promise.all([
    prisma.liveSession.findUnique({ where: { id: liveId }, select: { status: true, store: { select: { seller: { select: { userId: true } } } } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, avatar: true, status: true } }),
    prisma.liveBan.findUnique({ where: { liveSessionId_userId: { liveSessionId: liveId, userId } }, select: { id: true } }),
  ]);
  if (!live || live.status !== LiveStatus.LIVE) throw new AppError("Chat opens when the live starts.", 400);
  if (!user || user.status !== UserStatus.ACTIVE) throw new AppError("Log in to chat.", 401);
  if (ban) throw new AppError("The seller has turned off chat for you in this live.", 403);

  // Phone numbers, emails and social handles are masked, like in DMs with sellers.
  const message = await prisma.liveMessage.create({
    data: { liveSessionId: liveId, userId, text: hideContacts(text).text },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });
  const view = messageView(message, live.store.seller.userId);
  emitToLive(liveId, "live:chat", view);
  return view;
};

// ---------------------------------------------------------------------------
// Public: the live page, reminders, watching
// ---------------------------------------------------------------------------

export const getPublicLiveService = async (code: string, viewerId?: string) => {
  const live = await findLiveByCode(code);
  const sellerUserId = live.store.seller.userId;
  const showChat = live.status === LiveStatus.LIVE || live.status === LiveStatus.ENDED;

  const [interest, ban, messages, shippingOptions] = await Promise.all([
    viewerId
      ? prisma.liveInterest.findUnique({ where: { liveSessionId_userId: { liveSessionId: live.id, userId: viewerId } }, select: { id: true } })
      : null,
    viewerId
      ? prisma.liveBan.findUnique({ where: { liveSessionId_userId: { liveSessionId: live.id, userId: viewerId } }, select: { id: true } })
      : null,
    showChat
      ? prisma.liveMessage.findMany({
          where: { liveSessionId: live.id, isRemoved: false },
          orderBy: { createdAt: "desc" },
          take: CHAT_HISTORY,
          include: { user: { select: { id: true, name: true, avatar: true } } },
        })
      : [],
    // What buyers choose from when buying during the live.
    prisma.shippingOption.findMany({
      where: { storeId: live.storeId, isArchived: false },
      orderBy: { fee: "asc" },
      select: { id: true, name: true, fee: true, eta: true, type: true, areas: true, state: true, pickupAddress: true, vehicle: true },
    }),
  ]);

  return {
    ...baseView(live),
    storeAddress: storePickupAddress(live.store),
    shippingOptions,
    // Share links carry the store's referral code, so sign-ups count for the seller.
    referralCode: live.store.referralCode,
    isOwner: !!viewerId && viewerId === sellerUserId,
    isInterested: !!interest,
    isBanned: !!ban,
    messages: messages.reverse().map((message) => messageView(message, sellerUserId)),
  };
};

/** Live now + coming up, for the marketplace and store pages. */
export const listLivesService = async (storeSlug?: string) => {
  const now = new Date();
  const storeFilter: Prisma.LiveSessionWhereInput = {
    store: { isSuspended: false, ...(storeSlug ? { slug: storeSlug } : {}) },
  };
  const [live, upcoming] = await Promise.all([
    prisma.liveSession.findMany({
      where: { ...storeFilter, status: LiveStatus.LIVE },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: LIVE_INCLUDE,
    }),
    prisma.liveSession.findMany({
      where: { ...storeFilter, status: LiveStatus.SCHEDULED, scheduledAt: { gte: new Date(now.getTime() - 2 * 60 * MINUTE), lte: new Date(now.getTime() + 14 * 24 * 60 * MINUTE) } },
      orderBy: { scheduledAt: "asc" },
      take: 20,
      include: LIVE_INCLUDE,
    }),
  ]);
  return { live: live.map((item) => baseView(item, now)), upcoming: upcoming.map((item) => baseView(item, now)) };
};

export const setInterestService = async (userId: string, code: string, interested: boolean) => {
  const live = await findLiveByCode(code);
  if (live.store.seller.userId === userId) throw new AppError("This is your own live - share it with your buyers.", 400);

  if (interested) {
    if (live.status !== LiveStatus.SCHEDULED && live.status !== LiveStatus.LIVE) throw new AppError("This live has already ended.", 400);
    await prisma.liveInterest.upsert({
      where: { liveSessionId_userId: { liveSessionId: live.id, userId } },
      create: { liveSessionId: live.id, userId },
      update: {},
    });
  } else {
    await prisma.liveInterest.deleteMany({ where: { liveSessionId: live.id, userId } });
  }
  const interestedCount = await prisma.liveInterest.count({ where: { liveSessionId: live.id } });
  return { isInterested: interested, interestedCount };
};

/** A watch-only video token. Guests get one too - the website limits them to a short preview. */
export const getWatchTokenService = async (code: string, viewerId?: string) => {
  const live = await findLiveByCode(code);
  if (live.status !== LiveStatus.LIVE) throw new AppError("This live isn't on right now.", 400);

  const user = viewerId ? await prisma.user.findUnique({ where: { id: viewerId }, select: { id: true, name: true } }) : null;
  const identity = user ? `user_${user.id}` : `guest_${crypto.randomBytes(8).toString("hex")}`;
  const video = await createJoinToken({ liveId: live.id, identity, name: user?.name ?? "Guest", canPublish: false });
  return { ...video, guest: !user };
};

const icsDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** "Add to calendar" - a one-hour event pointing back to the live page. */
export const getLiveCalendarService = async (code: string) => {
  const live = await findLiveByCode(code);
  const url = `${process.env.FRONTEND_URL ?? "https://www.nestlyapp.site"}/live/${live.code}`;
  const start = live.scheduledAt;
  const end = new Date(start.getTime() + LIVE_MAX_MINUTES * MINUTE);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nestly//Live//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:live-${live.id}@nestlyapp.site`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(`${live.store.name} live on Nestly: ${live.title}`)}`,
    `DESCRIPTION:${icsText(`${live.description ? `${live.description}\n\n` : ""}Watch and shop live: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(`${live.store.name} goes live in 15 minutes`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return { filename: `nestly-live-${live.code}.ics`, body: lines.join("\r\n") };
};

// ---------------------------------------------------------------------------
// Buying during the live
// ---------------------------------------------------------------------------

/**
 * Starts paying for a featured product: creates the pending order and the
 * Paystack transaction, like a payment link. The live discount is applied
 * while it's active. Confirmed through the usual checkout verify / webhook.
 */
export const buyFromLiveService = async (userId: string, code: string, data: BuyFromLiveInput) => {
  const quantity = data.quantity ?? 1;
  const live = await findLiveByCode(code);
  const { store } = live;

  if (store.seller.userId === userId) throw new AppError("You can't buy from your own live.", 400);
  if (live.status !== LiveStatus.LIVE && live.status !== LiveStatus.ENDED) {
    throw new AppError(live.status === LiveStatus.CANCELLED ? "This live was cancelled." : "Buying opens when the live starts.", 400);
  }

  const featured = live.products.find((item) => item.productId === data.productId);
  if (!featured) throw new AppError("That product isn't part of this live.", 400);

  const [user, address, product, shippingOptions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.address.findUnique({ where: { id: data.addressId } }),
    prisma.product.findUnique({
      where: { id: data.productId },
      include: { images: true, specifications: true, category: true, ...OPTIONS_INCLUDE },
    }),
    prisma.shippingOption.findMany({ where: { storeId: store.id, isArchived: false } }),
  ]);
  if (!user) throw new AppError("User not found.", 404);
  if (!address || address.userId !== userId) throw new AppError("Address not found.", 404);
  if (!product || product.storeId !== store.id || product.status !== ProductStatus.PUBLISHED) {
    throw new AppError(`"${featured.product.title}" isn't available any more.`, 400);
  }

  // Products with options are bought as one combination.
  // (OPTIONS_INCLUDE already leaves out archived combinations.)
  const activeVariations = product.variations.filter((variation) => variation.isActive);
  const variation = data.variationId ? activeVariations.find((item) => item.id === data.variationId) : null;
  if (activeVariations.length > 0 && !variation) throw new AppError(`Choose an option for "${product.title}".`, 400);
  if (activeVariations.length === 0 && data.variationId) throw new AppError("That option isn't available.", 400);

  const inStock = variation ? variation.stock : product.stock;
  if (inStock <= 0) throw new AppError("Sold out.", 400);
  if (quantity > inStock) throw new AppError(`Only ${inStock} left - lower the quantity.`, 400);

  const option = shippingOptions.find((item) => item.id === data.shippingOptionId);
  if (!option) throw new AppError("That delivery option isn't available. Choose another.", 400);
  if (!canCarry(option, product.deliveryVehicle)) {
    throw new AppError(
      `"${option.name}" can't carry this item (it needs a ${VEHICLE_LABEL[product.deliveryVehicle]}). Choose another option.`,
      400
    );
  }
  const isPickup = option.type === ShippingOptionType.PICKUP;
  const shipping = {
    optionName: option.name,
    fee: option.fee,
    eta: option.eta,
    type: option.type,
    pickupAddress: isPickup ? option.pickupAddress ?? storePickupAddress(store) : null,
    vehicle: isPickup ? null : option.vehicle,
  };

  const listPrice = unitPriceOf(product, variation);
  const unitPrice = discountActive(live) ? applyDiscount(listPrice, featured.discountPercent) : listPrice;
  const subtotal = unitPrice * quantity;
  const deliveryFee = shipping.fee;
  const total = subtotal + deliveryFee;
  const totalKobo = Math.round(total * NAIRA_TO_KOBO);

  const commissionRate = referralRewardApplies(user, { id: store.id, sellerUserId: store.seller.userId })
    ? referralCommission(product.category.commissionRate)
    : product.category.commissionRate;
  const referralReward = commissionRate !== product.category.commissionRate;

  const fullStore = await prisma.store.findUniqueOrThrow({
    where: { id: store.id },
    select: { paystackSubaccountCode: true, payoutAccountUpdatedAt: true },
  });
  const paidViaSplit = routeViaSplit(fullStore);
  const split = paidViaSplit
    ? paystackSplitFor(totalKobo, [
        {
          subaccount: fullStore.paystackSubaccountCode!,
          share: Math.round(subtotal * (1 - commissionRate / 100) * NAIRA_TO_KOBO) + Math.round(deliveryFee * NAIRA_TO_KOBO),
        },
      ])
    : undefined;

  const note = data.note ? hideContacts(data.note.trim()).text : "";
  const reference = `NESTLY_${crypto.randomUUID().replace(/-/g, "")}`;

  // The unpaid order holds its stock while the buyer pays (utils/stockHold).
  const order = await prisma.$transaction(async (tx) => {
    await assertStockAvailable(tx, userId, [
      { productId: product.id, variationId: variation?.id ?? null, quantity, title: product.title },
    ]);

    return tx.order.create({
      data: {
        userId,
        addressId: address.id,
        liveSessionId: live.id,
        status: OrderStatus.PENDING,
        subtotal,
        deliveryFee,
        tax: 0,
        total,
        paymentMethod: "PAYSTACK",
        paymentReference: reference,
        deliveryPhone: data.deliveryPhone?.trim() || address.phone,
        source: data.source,
        items: {
          create: {
            productId: product.id,
            variationId: variation?.id ?? null,
            variantLabel: variation ? variationLabel(product.options, variation) : null,
            quantity,
            unitPrice,
            totalPrice: subtotal,
            commissionRate,
            referralReward,
            autoPaidViaSplit: paidViaSplit,
            ...snapshotOf(product),
          },
        },
        shipping: {
          create: {
            storeId: store.id,
            ...shipping,
            deliveryCode: generateDeliveryCode(),
            paidViaSplit,
            heldForPayout: holdPayoutsEnabled(),
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
    callbackUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/marketplace/orders` : undefined,
    split,
  });

  return {
    orderId: order.id,
    reference,
    accessCode: paystack.access_code,
    authorizationUrl: paystack.authorization_url,
    unitPrice,
    total,
  };
};

/** After a live order is paid: "Tolu just bought ..." and the new stock, for everyone watching. */
export const announceLivePurchase = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      liveSessionId: true,
      user: { select: { name: true } },
      items: { select: { productId: true, productTitle: true, product: { select: { stock: true } } } },
      liveSession: { select: { status: true } },
    },
  });
  if (!order?.liveSessionId || order.liveSession?.status !== LiveStatus.LIVE) return;

  const firstName = order.user.name.trim().split(/\s+/)[0] || "Someone";
  for (const item of order.items) {
    emitToLive(order.liveSessionId, "live:purchase", { name: firstName, productId: item.productId, productTitle: item.productTitle });
    emitToLive(order.liveSessionId, "live:stock", { productId: item.productId, stock: Math.max(0, item.product.stock) });
  }
};

// ---------------------------------------------------------------------------
// After the live
// ---------------------------------------------------------------------------

export const getLiveSummaryService = async (userId: string, id: string) => {
  const live = await getOwnedLive(userId, id);
  const from = live.startedAt ?? live.scheduledAt;
  const until = live.endedAt ?? new Date();

  const [units, chatMessages, newFollowers, signUps] = await Promise.all([
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { liveSessionId: id, status: { in: PAID_ORDER_STATUSES } } },
      _sum: { quantity: true, totalPrice: true },
    }),
    prisma.liveMessage.count({ where: { liveSessionId: id } }),
    prisma.storeFollow.count({ where: { storeId: live.storeId, createdAt: { gte: from, lte: until } } }),
    // New members who came through this store's links between announcing the live and a day after it.
    prisma.user.count({
      where: { referredByStoreId: live.storeId, referredAt: { gte: live.createdAt, lte: new Date(until.getTime() + 24 * 60 * MINUTE) } },
    }),
  ]);

  const titles = new Map(live.products.map((item) => [item.productId, item.product.title]));
  return {
    ...(await sellerView(live)),
    durationMinutes: live.startedAt ? Math.max(1, Math.round((until.getTime() - live.startedAt.getTime()) / MINUTE)) : 0,
    peakViewers: live.peakViewers,
    chatMessages,
    newFollowers,
    signUps,
    topProducts: units
      .map((row) => ({
        productId: row.productId,
        title: titles.get(row.productId) ?? "Product",
        units: row._sum.quantity ?? 0,
        revenue: row._sum.totalPrice ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue),
  };
};

/** Highest number watching at once (called from socket/live.ts as people come and go). */
export const recordViewerPeak = async (liveId: string, viewers: number) => {
  if (viewers <= 0) return;
  await prisma.liveSession.updateMany({ where: { id: liveId, status: LiveStatus.LIVE, peakViewers: { lt: viewers } }, data: { peakViewers: viewers } });
};
