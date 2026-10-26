-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "lastSetupReminderAt" TIMESTAMP(3),
ADD COLUMN     "setupRemindersSent" INTEGER NOT NULL DEFAULT 0;

