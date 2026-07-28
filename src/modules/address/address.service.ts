import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import {
  CreateAddressInput,
  UpdateAddressInput,
} from "./address.validation";

export const createAddressService = async (
  userId: string,
  data: CreateAddressInput
) => {
  const addressCount = await prisma.address.count({
    where: { userId },
  });

  const shouldBeDefault =
    data.isDefault || addressCount === 0;

  if (shouldBeDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.address.create({
    data: { ...data, userId, isDefault: shouldBeDefault },
  });
};

export const getAddressesService = async (
  userId: string
) => {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "desc" },
    ],
  });
};

export const updateAddressService = async (
  userId: string,
  addressId: string,
  data: UpdateAddressInput
) => {
  const address = await prisma.address.findUnique({
    where: { id: addressId },
  });

  if (!address) {
    throw new AppError("Address not found.", 404);
  }

  if (address.userId !== userId) {
    throw new AppError(
      "You are not authorized to update this address.",
      403
    );
  }

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: {
        userId,
        isDefault: true,
        NOT: { id: addressId },
      },
      data: { isDefault: false },
    });
  }

  return prisma.address.update({
    where: { id: addressId },
    data,
  });
};

export const deleteAddressService = async (
  userId: string,
  addressId: string
) => {
  const address = await prisma.address.findUnique({
    where: { id: addressId },
  });

  if (!address) {
    throw new AppError("Address not found.", 404);
  }

  if (address.userId !== userId) {
    throw new AppError(
      "You are not authorized to delete this address.",
      403
    );
  }

  const usedInOrders = await prisma.order.count({
    where: { addressId },
  });

  if (usedInOrders > 0) {
    throw new AppError(
      "Cannot delete an address used in past orders.",
      400
    );
  }

  await prisma.address.delete({
    where: { id: addressId },
  });

  if (address.isDefault) {
    const remaining = await prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    if (remaining) {
      await prisma.address.update({
        where: { id: remaining.id },
        data: { isDefault: true },
      });
    }
  }
};
