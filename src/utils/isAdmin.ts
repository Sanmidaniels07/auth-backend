import { Role } from "@prisma/client";

import prisma from "../prisma/prisma";

// Admins can still open suspended stores and their products (to review
// them); everyone else gets "not found". Checked against the database
// rather than the token, so a stale token can't unlock anything.
export const isAdminUser = async (userId?: string | null) => {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === Role.ADMIN;
};
