-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "reviewRemindersSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "salesStoppedAt" TIMESTAMP(3);

