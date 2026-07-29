import { Role } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
};

export const updateUserRoleService = async (
  adminUserId: string,
  targetUserId: string,
  role: Role
) => {
  if (adminUserId === targetUserId) {
    throw new AppError(
      "You cannot change your own role. Have another admin do it.",
      400
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: ADMIN_USER_SELECT,
  });
};
