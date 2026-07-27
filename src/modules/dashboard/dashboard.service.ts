import { OrderStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { getSellerStore } from "../seller/seller.utils";

// Orders only count toward revenue once payment has actually happened.
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const PENDING_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
];

export const getDashboardStatsService = async (
  userId: string
) => {
  const store = await getSellerStore(userId);

  const [totalProducts, sellerItems] = await Promise.all([
    prisma.product.count({
      where: {
        storeId: store.id,
        status: { not: "ARCHIVED" },
      },
    }),
    prisma.orderItem.findMany({
      where: { product: { storeId: store.id } },
      select: {
        orderId: true,
        totalPrice: true,
        order: {
          select: { userId: true, status: true },
        },
      },
    }),
  ]);

  const orderIds = new Set<string>();
  const customerIds = new Set<string>();
  const pendingOrderIds = new Set<string>();
  let totalRevenue = 0;

  for (const item of sellerItems) {
    orderIds.add(item.orderId);
    customerIds.add(item.order.userId);

    if (REVENUE_STATUSES.includes(item.order.status)) {
      totalRevenue += item.totalPrice;
    }

    if (PENDING_STATUSES.includes(item.order.status)) {
      pendingOrderIds.add(item.orderId);
    }
  }

  return {
    totalProducts,
    totalOrders: orderIds.size,
    totalRevenue,
    pendingOrders: pendingOrderIds.size,
    totalCustomers: customerIds.size,
    storeRating: store.rating,
  };
};

export const getRecentOrdersService = async (
  userId: string,
  limit: number
) => {
  const store = await getSellerStore(userId);

  const orders = await prisma.order.findMany({
    where: { items: { some: { product: { storeId: store.id } } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        where: { product: { storeId: store.id } },
        include: {
          product: { select: { id: true, title: true } },
        },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    customer: order.user,
    items: order.items,
    sellerSubtotal: order.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    ),
  }));
};

export const getInventorySnapshotService = async (
  userId: string,
  lowStockThreshold: number
) => {
  const store = await getSellerStore(userId);

  const [
    totalProducts,
    publishedCount,
    draftCount,
    outOfStockCount,
    lowStockProducts,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        storeId: store.id,
        status: { not: "ARCHIVED" },
      },
    }),
    prisma.product.count({
      where: { storeId: store.id, status: "PUBLISHED" },
    }),
    prisma.product.count({
      where: { storeId: store.id, status: "DRAFT" },
    }),
    prisma.product.count({
      where: { storeId: store.id, status: "OUT_OF_STOCK" },
    }),
    prisma.product.findMany({
      where: {
        storeId: store.id,
        status: { not: "ARCHIVED" },
        stock: { gt: 0, lte: lowStockThreshold },
      },
      select: { id: true, title: true, sku: true, stock: true },
      orderBy: { stock: "asc" },
      take: 10,
    }),
  ]);

  return {
    totalProducts,
    publishedCount,
    draftCount,
    outOfStockCount,
    lowStockThreshold,
    lowStockProducts,
  };
};

export const getSalesOverviewService = async (
  userId: string,
  days: number
) => {
  const store = await getSellerStore(userId);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const items = await prisma.orderItem.findMany({
    where: {
      product: { storeId: store.id },
      order: {
        createdAt: { gte: since },
        status: { in: REVENUE_STATUSES },
      },
    },
    select: {
      totalPrice: true,
      orderId: true,
      order: { select: { createdAt: true } },
    },
  });

  const byDate = new Map<
    string,
    { date: string; revenue: number; orderIds: Set<string> }
  >();

  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { date: key, revenue: 0, orderIds: new Set() });
  }

  for (const item of items) {
    const key = item.order.createdAt.toISOString().slice(0, 10);
    const bucket = byDate.get(key);

    if (bucket) {
      bucket.revenue += item.totalPrice;
      bucket.orderIds.add(item.orderId);
    }
  }

  return Array.from(byDate.values()).map((bucket) => ({
    date: bucket.date,
    revenue: bucket.revenue,
    orders: bucket.orderIds.size,
  }));
};

export const getTopProductsService = async (
  userId: string,
  limit: number
) => {
  const store = await getSellerStore(userId);

  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      product: { storeId: store.id },
      order: { status: { in: REVENUE_STATUSES } },
    },
    _sum: { quantity: true, totalPrice: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
    },
  });

  const productMap = new Map(
    products.map((product) => [product.id, product])
  );

  return grouped
    .map((g) => ({
      product: productMap.get(g.productId),
      unitsSold: g._sum.quantity ?? 0,
      revenue: g._sum.totalPrice ?? 0,
    }))
    .filter((entry) => entry.product);
};

export const getAnalyticsService = async (userId: string) => {
  const store = await getSellerStore(userId);

  const [orders, items] = await Promise.all([
    prisma.order.findMany({
      where: { items: { some: { product: { storeId: store.id } } } },
      select: { status: true },
    }),
    prisma.orderItem.findMany({
      where: {
        product: { storeId: store.id },
        order: { status: { in: REVENUE_STATUSES } },
      },
      select: {
        totalPrice: true,
        product: {
          select: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  const orderStatusBreakdown: Record<string, number> = {};
  for (const order of orders) {
    orderStatusBreakdown[order.status] =
      (orderStatusBreakdown[order.status] ?? 0) + 1;
  }

  const revenueByCategory = new Map<
    string,
    { categoryId: string; categoryName: string; revenue: number }
  >();

  for (const item of items) {
    const category = item.product.category;
    const existing = revenueByCategory.get(category.id);

    if (existing) {
      existing.revenue += item.totalPrice;
    } else {
      revenueByCategory.set(category.id, {
        categoryId: category.id,
        categoryName: category.name,
        revenue: item.totalPrice,
      });
    }
  }

  return {
    orderStatusBreakdown,
    revenueByCategory: Array.from(
      revenueByCategory.values()
    ).sort((a, b) => b.revenue - a.revenue),
  };
};
