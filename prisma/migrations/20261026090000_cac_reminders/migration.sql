-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "cacRemindersSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCacReminderAt" TIMESTAMP(3);

