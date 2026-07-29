import { OrderStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { getSellerStore } from "../seller/seller.utils";
import {
  REVENUE_STATUSES,
  getStoreAvailableBalance,
} from "../../utils/sellerRevenue";

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

interface CustomerSummary {
  user: { id: string; name: string; email: string };
  totalOrders: Set<string>;
  totalSpent: number;
  lastOrderAt: Date;
}

export const getSellerCustomersService = async (
  userId: string,
  page: number,
  limit: number
) => {
  const store = await getSellerStore(userId);

  const items = await prisma.orderItem.findMany({
    where: {
      product: { storeId: store.id },
      order: { status: { not: OrderStatus.PENDING } },
    },
    select: {
      totalPrice: true,
      orderId: true,
      order: {
        select: {
          userId: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  const customerMap = new Map<string, CustomerSummary>();

  for (const item of items) {
    const customerId = item.order.userId;
    const existing = customerMap.get(customerId);

    if (existing) {
      existing.totalOrders.add(item.orderId);
      existing.totalSpent += item.totalPrice;
      if (item.order.createdAt > existing.lastOrderAt) {
        existing.lastOrderAt = item.order.createdAt;
      }
    } else {
      customerMap.set(customerId, {
        user: item.order.user,
        totalOrders: new Set([item.orderId]),
        totalSpent: item.totalPrice,
        lastOrderAt: item.order.createdAt,
      });
    }
  }

  const allCustomers = Array.from(customerMap.values())
    .map((customer) => ({
      user: customer.user,
      totalOrders: customer.totalOrders.size,
      totalSpent: customer.totalSpent,
      lastOrderAt: customer.lastOrderAt,
    }))
    .sort(
      (a, b) =>
        b.lastOrderAt.getTime() - a.lastOrderAt.getTime()
    );

  const total = allCustomers.length;
  const skip = (page - 1) * limit;
  const customers = allCustomers.slice(skip, skip + limit);

  return {
    customers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getSellerEarningsService = async (
  userId: string
) => {
  const store = await getSellerStore(userId);

  return getStoreAvailableBalance(store.id);
};

export const getStoreTrafficService = async (
  userId: string,
  days: number
) => {
  const store = await getSellerStore(userId);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const [totalViews, uniqueVisitorRows, views] = await Promise.all([
    prisma.storeView.count({
      where: { storeId: store.id, viewedAt: { gte: since } },
    }),
    prisma.storeView.findMany({
      where: {
        storeId: store.id,
        viewedAt: { gte: since },
        viewerId: { not: null },
      },
      select: { viewerId: true },
      distinct: ["viewerId"],
    }),
    prisma.storeView.findMany({
      where: { storeId: store.id, viewedAt: { gte: since } },
      select: { viewedAt: true },
    }),
  ]);

  const byDate = new Map<string, number>();

  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    byDate.set(d.toISOString().slice(0, 10), 0);
  }

  for (const view of views) {
    const key = view.viewedAt.toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + 1);
  }

  return {
    totalViews,
    uniqueVisitors: uniqueVisitorRows.length,
    followersCount: await prisma.storeFollow.count({
      where: { storeId: store.id },
    }),
    dailyViews: Array.from(byDate.entries()).map(
      ([date, views]) => ({ date, views })
    ),
  };
};

export const getSellerPayoutsService = async (
  userId: string,
  page: number,
  limit: number
) => {
  const store = await getSellerStore(userId);
  const skip = (page - 1) * limit;

  const [payouts, total] = await Promise.all([
    prisma.payout.findMany({
      where: { storeId: store.id },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.payout.count({ where: { storeId: store.id } }),
  ]);

  return {
    payouts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
