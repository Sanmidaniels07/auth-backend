import { ProductStatus } from "@prisma/client";

// What an approved seller still has to do before buyers can actually order
// and get paid out. One definition, used by the Seller Hub / dashboard
// banners (GET /seller/me/readiness) and the occasional reminders.

export type ReadinessKey = "STORE" | "PAYOUT" | "DELIVERY" | "PRODUCT";

export const READINESS_STEPS: { key: ReadinessKey; title: string; why: string; path: string }[] = [
  {
    key: "STORE",
    title: "Set up your store",
    why: "Your store is where buyers find you - name, logo and location.",
    path: "/marketplace/sell",
  },
  {
    key: "PAYOUT",
    title: "Add your payout bank account",
    why: "So money from each sale is paid straight to your bank instead of waiting for a manual payout.",
    path: "/settings/marketplace?tab=store#payout-account",
  },
  {
    key: "DELIVERY",
    title: "Add delivery zones or pickup",
    why: "Buyers need a way to get their order - set prices for the areas you deliver to, or offer pickup.",
    path: "/settings/marketplace?tab=store#delivery-zones",
  },
  {
    key: "PRODUCT",
    title: "Publish your first product",
    why: "Buyers can only order what's listed and published.",
    path: "/settings/marketplace/components/products/new",
  },
];

// Select this on a SellerProfile to work out readiness.
export const READINESS_SELECT = {
  store: {
    select: {
      paystackSubaccountCode: true,
      _count: {
        select: {
          shippingOptions: { where: { isArchived: false } },
          products: { where: { status: ProductStatus.PUBLISHED } },
        },
      },
    },
  },
} as const;

interface ReadinessSource {
  store: {
    paystackSubaccountCode: string | null;
    _count: { shippingOptions: number; products: number };
  } | null;
}

// Keys of the steps still to do, in order.
export const missingSetup = (seller: ReadinessSource): ReadinessKey[] => {
  if (!seller.store) return ["STORE", "PAYOUT", "DELIVERY", "PRODUCT"];
  const missing: ReadinessKey[] = [];
  if (!seller.store.paystackSubaccountCode) missing.push("PAYOUT");
  if (seller.store._count.shippingOptions === 0) missing.push("DELIVERY");
  if (seller.store._count.products === 0) missing.push("PRODUCT");
  return missing;
};
