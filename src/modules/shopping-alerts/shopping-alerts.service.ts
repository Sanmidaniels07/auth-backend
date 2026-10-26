import { NotificationType, ProductStatus, UserStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { sendEmail } from "../auth/email.services";
import { createNotificationService } from "../notification/notification.service";
import { backInStockEmail, cartReminderEmail } from "../../templates/shopping-emails.template";

// Shopping updates for buyers (NotificationType.SHOPPING - one switch in
// Settings -> Notifications turns them all off): new products from stores
// they follow, a reminder about a cart they left, and "back in stock".
// Run by jobs/shopping-alerts.job.ts. Every alert is claimed in the
// database before it's sent, so overlapping runs never double up.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const frontend = () => process.env.FRONTEND_URL ?? "";
const settingsUrl = () => `${frontend()}/settings/notifications`;

const shoppingEnabled = async (userId: string) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type: NotificationType.SHOPPING } },
  });
  return preference?.enabled ?? true;
};

const primaryImage = { where: { isPrimary: true }, take: 1, select: { url: true } } as const;

// A store's products are announced together once it has stopped adding
// for a bit - one alert for a batch of new listings, not one per product.
const SETTLE_MS = 30 * MINUTE;

/** Tell each store's followers about products it published since the last run. */
export const notifyFollowersOfNewProductsService = async (now = new Date()) => {
  const fresh = await prisma.product.findMany({
    where: {
      followersNotifiedAt: null,
      status: ProductStatus.PUBLISHED,
      store: { isSuspended: false },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      storeId: true,
      store: { select: { name: true, slug: true, seller: { select: { userId: true } } } },
    },
  });

  const byStore = new Map<string, typeof fresh>();
  for (const product of fresh) byStore.set(product.storeId, [...(byStore.get(product.storeId) ?? []), product]);

  let sent = 0;
  for (const products of byStore.values()) {
    const latest = Math.max(...products.map((p) => p.updatedAt.getTime()));
    if (now.getTime() - latest < SETTLE_MS) continue;

    const claimed = await prisma.product.updateMany({
      where: { id: { in: products.map((p) => p.id) }, followersNotifiedAt: null },
      data: { followersNotifiedAt: now },
    });
    if (claimed.count === 0) continue;

    const { store } = products[0];
    const followers = await prisma.storeFollow.findMany({
      where: { storeId: products[0].storeId, userId: { not: store.seller.userId }, user: { status: UserStatus.ACTIVE } },
      select: { userId: true },
    });

    const one = products.length === 1;
    const title = `New from ${store.name}`;
    const message = one
      ? `${store.name} just listed "${products[0].title}".`
      : `${store.name} added ${products.length} new products, including "${products[products.length - 1].title}".`;
    const target = one ? { type: "PRODUCT_PAGE", id: products[0].id } : { type: "STORE_PAGE", id: store.slug };

    for (const { userId } of followers) {
      const created = await createNotificationService(userId, title, message, NotificationType.SHOPPING, target).catch(() => null);
      if (created) sent += 1;
    }
  }
  return sent;
};

// Remind a few hours after the last thing was added, and not about carts
// that have gone cold.
const CART_REMIND_AFTER_MS = 4 * HOUR;
const CART_GIVE_UP_AFTER_MS = 72 * HOUR;

/** "You left something in your cart" - once per batch of additions. */
export const sendCartRemindersService = async (now = new Date()) => {
  const carts = await prisma.cart.findMany({
    where: {
      items: { some: { createdAt: { gte: new Date(now.getTime() - CART_GIVE_UP_AFTER_MS) } } },
      user: { status: UserStatus.ACTIVE, isVerified: true, deletedAt: null },
    },
    select: {
      id: true,
      reminderSentAt: true,
      user: { select: { id: true, name: true, email: true } },
      items: {
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          quantity: true,
          variation: { select: { price: true, stock: true, isActive: true } },
          product: {
            select: { title: true, price: true, stock: true, status: true, store: { select: { isSuspended: true } }, images: primaryImage },
          },
        },
      },
    },
  });

  let sent = 0;
  for (const cart of carts) {
    const lastAdded = cart.items[0]?.createdAt;
    if (!lastAdded) continue;
    const age = now.getTime() - lastAdded.getTime();
    if (age < CART_REMIND_AFTER_MS || age > CART_GIVE_UP_AFTER_MS) continue;
    if (cart.reminderSentAt && cart.reminderSentAt >= lastAdded) continue;

    // Only things they can actually buy right now.
    const available = cart.items.filter(
      (item) =>
        item.product.status === ProductStatus.PUBLISHED &&
        !item.product.store.isSuspended &&
        (item.variation ? item.variation.isActive && item.variation.stock > 0 : item.product.stock > 0)
    );
    if (available.length === 0) continue;

    const claimed = await prisma.cart.updateMany({
      where: { id: cart.id, OR: [{ reminderSentAt: null }, { reminderSentAt: { lt: lastAdded } }] },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0 || !(await shoppingEnabled(cart.user.id))) continue;

    const count = available.reduce((sum, item) => sum + item.quantity, 0);
    await createNotificationService(
      cart.user.id,
      "Still thinking it over?",
      `You have ${count} item${count === 1 ? "" : "s"} waiting in your cart, including "${available[0].product.title}".`,
      NotificationType.SHOPPING,
      { type: "CART", id: cart.id }
    ).catch(() => null);

    await sendEmail(
      cart.user.email,
      "You left something in your Nestly cart",
      cartReminderEmail({
        name: cart.user.name,
        lines: available.slice(0, 3).map((item) => ({
          title: item.product.title,
          price: item.variation?.price ?? item.product.price,
          quantity: item.quantity,
          imageUrl: item.product.images[0]?.url,
        })),
        more: Math.max(0, available.length - 3),
        cartUrl: `${frontend()}/marketplace/cart`,
        settingsUrl: settingsUrl(),
      })
    ).catch((error) => console.error("Cart reminder email failed:", error));
    sent += 1;
  }
  return sent;
};

/** "It's back" for every alert whose product (or option) can be bought again. */
export const sendBackInStockAlertsService = async () => {
  const alerts = await prisma.stockAlert.findMany({
    where: { product: { status: ProductStatus.PUBLISHED, store: { isSuspended: false } } },
    select: {
      id: true,
      variation: { select: { stock: true, isActive: true, isArchived: true, price: true } },
      user: { select: { id: true, name: true, email: true, status: true } },
      product: { select: { id: true, title: true, price: true, stock: true, store: { select: { name: true } }, images: primaryImage } },
    },
  });

  let sent = 0;
  for (const alert of alerts) {
    const ready = alert.variation
      ? alert.variation.isActive && !alert.variation.isArchived && alert.variation.stock > 0
      : alert.product.stock > 0;
    if (!ready) continue;

    // One-shot: claim it by deleting it.
    const claimed = await prisma.stockAlert.deleteMany({ where: { id: alert.id } });
    if (claimed.count === 0 || alert.user.status !== UserStatus.ACTIVE || !(await shoppingEnabled(alert.user.id))) continue;

    const { product } = alert;
    await createNotificationService(
      alert.user.id,
      "Back in stock",
      `"${product.title}" from ${product.store.name} is available again - grab it before it sells out.`,
      NotificationType.SHOPPING,
      { type: "PRODUCT_PAGE", id: product.id }
    ).catch(() => null);

    await sendEmail(
      alert.user.email,
      `${product.title} is back in stock`,
      backInStockEmail({
        name: alert.user.name,
        productTitle: product.title,
        storeName: product.store.name,
        price: alert.variation?.price ?? product.price,
        imageUrl: product.images[0]?.url,
        productUrl: `${frontend()}/marketplace/product/${product.id}`,
        settingsUrl: settingsUrl(),
      })
    ).catch((error) => console.error("Back in stock email failed:", error));
    sent += 1;
  }
  return sent;
};
