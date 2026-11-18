import { PrismaClient } from "@prisma/client";

// Order.guestAccessToken is the key to a guest's private order page, which
// shows their delivery code. Never return it by default (sellers and admins
// get orders with every column); code that needs it selects it explicitly
// or opts back in with omit: { guestAccessToken: false }.
const prisma = new PrismaClient({
  omit: {
    order: { guestAccessToken: true },
  },
});

export default prisma;