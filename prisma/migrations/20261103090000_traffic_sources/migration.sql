-- CreateEnum
CREATE TYPE "TrafficSource" AS ENUM ('GOOGLE', 'OTHER_SEARCH', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'X', 'SELLER_LINK', 'PAYMENT_LINK', 'OTHER_SITE', 'DIRECT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signupSource" "TrafficSource";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "source" "TrafficSource";

