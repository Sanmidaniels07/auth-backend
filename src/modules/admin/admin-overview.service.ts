import { OrderItemStatus, OrderStatus, Prisma, ProductStatus, SellerStatus, UserStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { REVENUE_STATUSES } from "../../utils/sellerRevenue";
import { READINESS_SELECT, missingSetup } from "../../utils/sellerReadiness";
import { HOLD_MINUTES } from "../../utils/stockHold";

// The admin Overview tab: how the platform is doing over the last N days,
// each headline number next to the N days before it. Money is in naira;
// "sales" (GMV) is what buyers paid on orders that went through.

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = "Africa/Lagos";
const TOP = 5;

// Fixed enum names, inlined into the raw queries (a bound text parameter
// can't be compared with an enum column).
const REVENUE_IN = Prisma.raw(REVENUE_STATUSES.map((status) => `'${status}'`).join(", "));
const ITEM_CANCELLED = Prisma.raw(`'${OrderItemStatus.CANCELLED}'`);

const paidOrdersBetween = (from: Date, to: Date): Prisma.OrderWhereInput => ({
  status: { in: REVENUE_STATUSES },
  createdAt: { gte: from, lt: to },
});

const salesBetween = async (from: Date, to: Date) => {
  const [orders, commission] = await Promise.all([
    prisma.order.aggregate({ where: paidOrdersBetween(from, to), _count: { _all: true }, _sum: { total: true } }),
    // Each item carries the commission rate in force when it was bought
    // (already reduced for seller-referred buyers).
    prisma.$queryRaw<{ commission: number | null }[]>`
      SELECT SUM(oi."totalPrice" * oi."commissionRate" / 100)::float AS commission
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status IN (${REVENUE_IN}) AND o."createdAt" >= ${from} AND o."createdAt" < ${to}
        AND oi.status <> ${ITEM_CANCELLED}`,
  ]);
  return {
    orders: orders._count._all,
    sales: orders._sum.total ?? 0,
    commission: Math.round((commission[0]?.commission ?? 0) * 100) / 100,
  };
};

const lagosDay = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

export const getAdminOverviewService = async (days: number, now: Date = new Date()) => {
  const since = new Date(now.getTime() - days * DAY_MS);
  const prevSince = new Date(since.getTime() - days * DAY_MS);
  const holdCutoff = new Date(now.getTime() - HOLD_MINUTES * 60 * 1000);
  const liveUser: Prisma.UserWhereInput = { deletedAt: null };

  const [
    totalUsers,
    newUsers,
    newUsersPrev,
    activeUsers,
    googleUsers,
    verifiedUsers,
    usersByStatus,
    sellersByStatus,
    newApplications,
    newApplicationsPrev,
    verifiedSellers,
    approvedSellers,
    totalStores,
    suspendedStores,
    productsByStatus,
    sales,
    salesPrev,
    linkSales,
    deliveryFees,
    unpaidCheckouts,
    cancelledOrders,
    refundsToDo,
    signupSources,
    orderSources,
    productViews,
    storeViews,
    profileViews,
  ] = await Promise.all([
    prisma.user.count({ where: liveUser }),
    prisma.user.count({ where: { ...liveUser, createdAt: { gte: since } } }),
    prisma.user.count({ where: { ...liveUser, createdAt: { gte: prevSince, lt: since } } }),
    // Had Nestly open, or signed in, during the period.
    prisma.user.count({
      where: { ...liveUser, OR: [{ lastSeenAt: { gte: since } }, { sessions: { some: { createdAt: { gte: since } } } }] },
    }),
    prisma.user.count({ where: { ...liveUser, googleId: { not: null } } }),
    prisma.user.count({ where: { ...liveUser, isVerified: true } }),
    prisma.user.groupBy({ by: ["status"], where: liveUser, _count: { _all: true } }),
    prisma.sellerProfile.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.sellerProfile.count({ where: { createdAt: { gte: since } } }),
    prisma.sellerProfile.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
    prisma.sellerProfile.count({ where: { status: SellerStatus.APPROVED, isVerified: true } }),
    prisma.sellerProfile.findMany({ where: { status: SellerStatus.APPROVED }, select: READINESS_SELECT }),
    prisma.store.count(),
    prisma.store.count({ where: { isSuspended: true } }),
    prisma.product.groupBy({ by: ["status"], _count: { _all: true } }),
    salesBetween(since, now),
    salesBetween(prevSince, since),
    prisma.order.aggregate({
      where: { ...paidOrdersBetween(since, now), paymentLinkId: { not: null } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.order.aggregate({ where: paidOrdersBetween(since, now), _sum: { deliveryFee: true } }),
    // Started paying but never finished (hold already over).
    prisma.order.count({ where: { status: OrderStatus.PENDING, createdAt: { gte: since, lt: holdCutoff } } }),
    prisma.order.count({ where: { status: OrderStatus.CANCELLED, createdAt: { gte: since } } }),
    // Sold-out refunds Paystack refused - all time, until someone handles them.
    prisma.order.count({ where: { refundStatus: "FAILED" } }),
    prisma.user.groupBy({ by: ["signupSource"], where: { ...liveUser, createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["source"], where: paidOrdersBetween(since, now), _count: { _all: true }, _sum: { total: true } }),
    prisma.recentlyViewed.count({ where: { viewedAt: { gte: since } } }),
    prisma.storeView.count({ where: { viewedAt: { gte: since } } }),
    prisma.profileView.count({ where: { viewedAt: { gte: since } } }),
  ]);

  const [dailySignups, dailySales, topStores, topProducts] = await Promise.all([
    prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TIME_ZONE}, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
      FROM "User" WHERE "deletedAt" IS NULL AND "createdAt" >= ${since}
      GROUP BY day`,
    prisma.$queryRaw<{ day: string; orders: number; sales: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TIME_ZONE}, 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS orders, COALESCE(SUM(total), 0)::float AS sales
      FROM "Order" WHERE status IN (${REVENUE_IN}) AND "createdAt" >= ${since}
      GROUP BY day`,
    prisma.$queryRaw<{ id: string; name: string; slug: string; orders: number; sales: number }[]>`
      SELECT s.id, s.name, s.slug, COUNT(DISTINCT o.id)::int AS orders, SUM(oi."totalPrice")::float AS sales
      FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "Product" p ON p.id = oi."productId"
        JOIN "Store" s ON s.id = p."storeId"
      WHERE o.status IN (${REVENUE_IN}) AND o."createdAt" >= ${since} AND oi.status <> ${ITEM_CANCELLED}
      GROUP BY s.id, s.name, s.slug
      ORDER BY sales DESC
      LIMIT ${TOP}`,
    prisma.$queryRaw<{ id: string; title: string; storeName: string; isPaymentLink: boolean; units: number; sales: number }[]>`
      SELECT p.id, COALESCE(MAX(oi."productTitle"), p.title) AS title, s.name AS "storeName",
        (p.status = ${Prisma.raw(`'${ProductStatus.PRIVATE}'`)}) AS "isPaymentLink",
        SUM(oi.quantity)::int AS units, SUM(oi."totalPrice")::float AS sales
      FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "Product" p ON p.id = oi."productId"
        JOIN "Store" s ON s.id = p."storeId"
      WHERE o.status IN (${REVENUE_IN}) AND o."createdAt" >= ${since} AND oi.status <> ${ITEM_CANCELLED}
      GROUP BY p.id, p.title, p.status, s.name
      ORDER BY units DESC, sales DESC
      LIMIT ${TOP}`,
  ]);

  // One row per day, oldest first, zeros where nothing happened.
  const signupsByDay = new Map(dailySignups.map((row) => [row.day, row.count]));
  const salesByDay = new Map(dailySales.map((row) => [row.day, row]));
  const daily = Array.from({ length: days }, (_, i) => {
    const day = lagosDay(new Date(now.getTime() - (days - 1 - i) * DAY_MS));
    return {
      date: day,
      signups: signupsByDay.get(day) ?? 0,
      orders: salesByDay.get(day)?.orders ?? 0,
      sales: salesByDay.get(day)?.sales ?? 0,
    };
  });

  const withStatus = (rows: { status: string; _count: { _all: number } }[], status: string) =>
    rows.find((row) => row.status === status)?._count._all ?? 0;

  return {
    range: { days, since, until: now },
    users: {
      total: totalUsers,
      new: newUsers,
      newPrev: newUsersPrev,
      active: activeUsers,
      google: googleUsers,
      verified: verifiedUsers,
      suspended: withStatus(usersByStatus, UserStatus.SUSPENDED),
      banned: withStatus(usersByStatus, UserStatus.BANNED),
    },
    sellers: {
      pending: withStatus(sellersByStatus, SellerStatus.PENDING),
      approved: withStatus(sellersByStatus, SellerStatus.APPROVED),
      rejected: withStatus(sellersByStatus, SellerStatus.REJECTED),
      verified: verifiedSellers,
      readyToSell: approvedSellers.filter((seller) => missingSetup(seller).length === 0).length,
      newApplications,
      newApplicationsPrev,
      stores: totalStores,
      suspendedStores,
    },
    products: {
      live: withStatus(productsByStatus, ProductStatus.PUBLISHED),
      soldOut: withStatus(productsByStatus, ProductStatus.OUT_OF_STOCK),
      drafts: withStatus(productsByStatus, ProductStatus.DRAFT),
      paymentLinkItems: withStatus(productsByStatus, ProductStatus.PRIVATE),
    },
    orders: {
      paid: sales.orders,
      paidPrev: salesPrev.orders,
      sales: sales.sales,
      salesPrev: salesPrev.sales,
      commission: sales.commission,
      commissionPrev: salesPrev.commission,
      averageOrder: sales.orders ? Math.round(sales.sales / sales.orders) : 0,
      deliveryFees: deliveryFees._sum.deliveryFee ?? 0,
      paymentLinkOrders: linkSales._count._all,
      paymentLinkSales: linkSales._sum.total ?? 0,
      unpaidCheckouts,
      cancelled: cancelledOrders,
      refundsToDo,
    },
    // UNKNOWN = sign-ups/orders from before sources were recorded.
    sources: {
      signups: signupSources
        .map((row) => ({ source: row.signupSource ?? "UNKNOWN", count: row._count._all }))
        .sort((a, b) => b.count - a.count),
      orders: orderSources
        .map((row) => ({ source: row.source ?? "UNKNOWN", orders: row._count._all, sales: row._sum.total ?? 0 }))
        .sort((a, b) => b.sales - a.sales),
    },
    engagement: { productViews, storeViews, profileViews },
    daily,
    topStores,
    topProducts,
  };
};
