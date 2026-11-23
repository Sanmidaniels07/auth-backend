-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REMINDER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastWinbackReminderAt" TIMESTAMP(3),
ADD COLUMN     "winbackRemindersSent" INTEGER NOT NULL DEFAULT 0;
