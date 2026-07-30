import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { getStoreAvailableBalance } from "../../utils/sellerRevenue";

export const getStorePayoutInfoService = async (storeId: string) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      payoutBankName: true,
      payoutAccountNumber: true,
      payoutAccountName: true,
    },
  });

  if (!store) {
    throw new AppError("Store not found.", 404);
  }

  const balance = await getStoreAvailableBalance(storeId);

  return { store, ...balance };
};

export const createPayoutService = async (
  adminUserId: string,
  storeId: string,
  amount: number,
  note?: string
) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    throw new AppError("Store not found.", 404);
  }

  const { availableBalance } = await getStoreAvailableBalance(
    storeId
  );

  if (amount > availableBalance) {
    throw new AppError(
      `Amount exceeds available balance (${availableBalance}).`,
      400
    );
  }

  return prisma.payout.create({
    data: {
      storeId,
      amount,
      note,
      createdBy: adminUserId,
    },
  });
};

export const listPayoutsService = async (
  page: number,
  limit: number,
  storeId?: string
) => {
  const skip = (page - 1) * limit;
  const where = storeId ? { storeId } : {};

  const [payouts, total] = await Promise.all([
    prisma.payout.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        store: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    prisma.payout.count({ where }),
  ]);

  return {
    payouts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
