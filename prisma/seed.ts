// Fills a fresh STAGING (or local) database with realistic test data:
// categories with commission rates, an admin, two buyers, an approved
// seller with a store, shipping options and published products.
//
// Refuses to run unless APP_ENV=staging or APP_ENV=development, so it can
// never touch production by accident. Safe to re-run: everything is upserted
// by its unique email / slug / sku.
//
//   APP_ENV=staging npm run seed        (with the staging DATABASE_URL in .env)

import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcrypt";
import { PrismaClient, ProductStatus, Role, SellerStatus } from "@prisma/client";

const ALLOWED_ENVS = ["staging", "development"];
const TEST_PASSWORD = "NestlyTest123!";

const prisma = new PrismaClient();

const categories = [
  { name: "Food", slug: "food", commissionRate: 8 },
  { name: "Fashion", slug: "fashion", commissionRate: 10 },
  { name: "Electronics", slug: "electronics", commissionRate: 5 },
  { name: "Beauty", slug: "beauty", commissionRate: 12 },
];

const products = [
  {
    title: "Red Velvet Cupcakes (Box of 6)",
    slug: "staging-red-velvet-cupcakes",
    sku: "STG-CAKE-001",
    category: "food",
    price: 6500,
    stock: 20,
    image: "https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=800",
    description: "Soft red velvet cupcakes with cream cheese frosting. Freshly made to order.",
  },
  {
    title: "Ankara Print Shirt",
    slug: "staging-ankara-shirt",
    sku: "STG-FASH-001",
    category: "fashion",
    price: 15000,
    stock: 8,
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800",
    description: "Short-sleeve shirt in a bold Ankara print. Sizes M to XL.",
  },
  {
    title: "Wireless Earbuds",
    slug: "staging-wireless-earbuds",
    sku: "STG-ELEC-001",
    category: "electronics",
    price: 22000,
    stock: 3,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800",
    description: "Bluetooth 5.3 earbuds with charging case. Low stock on purpose, for testing alerts.",
  },
  {
    title: "Shea Butter Body Cream",
    slug: "staging-shea-body-cream",
    sku: "STG-BEAU-001",
    category: "beauty",
    price: 4000,
    stock: 0,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800",
    description: "Out of stock on purpose, for testing that it can't be added to the cart.",
  },
];

const upsertUser = async (email: string, name: string, username: string, role: Role, password: string) =>
  prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, username, role, password, isVerified: true },
  });

const main = async () => {
  const env = process.env.APP_ENV ?? "";
  if (!ALLOWED_ENVS.includes(env)) {
    throw new Error(`Refusing to seed: APP_ENV must be one of ${ALLOWED_ENVS.join(", ")} (got "${env || "unset"}").`);
  }

  const dbHost = new URL(process.env.DATABASE_URL as string).host;
  console.log(`Seeding ${env} database at ${dbHost}\n`);

  const password = await bcrypt.hash(TEST_PASSWORD, 10);

  for (const category of categories) {
    await prisma.category.upsert({ where: { slug: category.slug }, update: {}, create: category });
  }

  await upsertUser("admin@staging.nestlyapp.site", "Staging Admin", "staging_admin", Role.ADMIN, password);
  await upsertUser("buyer.a@staging.nestlyapp.site", "Buyer A", "buyer_a", Role.USER, password);
  await upsertUser("buyer.b@staging.nestlyapp.site", "Buyer B", "buyer_b", Role.USER, password);
  const sellerUser = await upsertUser("seller@staging.nestlyapp.site", "Test Seller", "test_seller", Role.USER, password);

  const seller = await prisma.sellerProfile.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: { userId: sellerUser.id, status: SellerStatus.APPROVED, statusUpdatedAt: new Date() },
  });

  const store = await prisma.store.upsert({
    where: { sellerId: seller.id },
    update: {},
    create: {
      sellerId: seller.id,
      name: "Staging Test Store",
      slug: "staging-test-store",
      description: "A test store for QA. Payout account is set up by testers using Paystack test bank details.",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
      isVerified: true,
    },
  });

  const existingOptions = await prisma.shippingOption.count({ where: { storeId: store.id } });
  if (existingOptions === 0) {
    await prisma.shippingOption.createMany({
      data: [
        { storeId: store.id, name: "Same-day Lagos", fee: 2500, eta: "Same day" },
        { storeId: store.id, name: "Pickup", fee: 0, eta: "Ready in 2 hours" },
      ],
    });
  }

  const categoryIds = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id])
  );

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: {
        storeId: store.id,
        categoryId: categoryIds.get(product.category) as string,
        title: product.title,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        price: product.price,
        stock: product.stock,
        status: product.stock > 0 ? ProductStatus.PUBLISHED : ProductStatus.OUT_OF_STOCK,
        images: { create: [{ url: product.image, isPrimary: true }] },
      },
    });
  }

  console.log("Done. Test accounts (password for all: " + TEST_PASSWORD + "):");
  console.log("  admin@staging.nestlyapp.site   - Admin");
  console.log("  buyer.a@staging.nestlyapp.site - Buyer A");
  console.log("  buyer.b@staging.nestlyapp.site - Buyer B");
  console.log("  seller@staging.nestlyapp.site  - Seller (store: Staging Test Store)");
};

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
