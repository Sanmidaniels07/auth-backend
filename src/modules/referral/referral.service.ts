import { OrderItemStatus, OrderStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { getSellerStore } from "../seller/seller.utils";
import { REFERRAL_COMMISSION_OFF, REFERRAL_REWARD_DAYS, generateReferralCode } from "../../utils/referral";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Someone opened Nestly through a seller's share link. Unknown codes and
 * suspended stores are ignored quietly - a visit is only a count.
 */
export const recordReferralVisitService = async (code: string, path?: string) => {
  const store = await prisma.store.findUnique({
    where: { referralCode: code.toUpperCase() },
    select: { id: true, isSuspended: true },
  });
  if (!store || store.isSuspended) return;

  await prisma.referralVisit.create({ data: { storeId: store.id, path: path || null } });
};

/**
 * The seller's referral code and what their share links have brought in:
 * visits, new buyers who joined, orders from them and commission saved.
 */
export const getMyReferralStatsService = async (userId: string) => {
  const store = await getSellerStore(userId);

  // Stores created before referrals existed (or in the gap before the
  // migration ran) get their code here.
  const code =
    store.referralCode ??
    (await prisma.store.update({ where: { id: store.id }, data: { referralCode: await generateReferralCode() } })).referralCode;

  const since = new Date(Date.now() - 30 * DAY_MS);
  const rewardedItems = {
    referralReward: true,
    product: { storeId: store.id },
    status: { not: OrderItemStatus.CANCELLED },
    order: { status: { notIn: [OrderStatus.PENDING, OrderStatus.CANCELLED] } },
  };

  const [visitsLast30Days, visitsTotal, buyersJoined, items] = await Promise.all([
    prisma.referralVisit.count({ where: { storeId: store.id, createdAt: { gte: since } } }),
    prisma.referralVisit.count({ where: { storeId: store.id } }),
    prisma.user.count({ where: { referredByStoreId: store.id } }),
    prisma.orderItem.findMany({ where: rewardedItems, select: { orderId: true, totalPrice: true } }),
  ]);

  const sales = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    code,
    rewardPercent: REFERRAL_COMMISSION_OFF,
    rewardDays: REFERRAL_REWARD_DAYS,
    visitsLast30Days,
    visitsTotal,
    buyersJoined,
    ordersFromReferrals: new Set(items.map((item) => item.orderId)).size,
    salesFromReferrals: sales,
    commissionSaved: Math.round(sales * REFERRAL_COMMISSION_OFF) / 100,
  };
};
