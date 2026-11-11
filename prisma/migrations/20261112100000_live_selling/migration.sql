-- CreateEnum
CREATE TYPE "LiveStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LIVE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "liveSessionId" TEXT;

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" "LiveStatus" NOT NULL DEFAULT 'SCHEDULED',
    "pinnedProductId" TEXT,
    "peakViewers" INTEGER NOT NULL DEFAULT 0,
    "endReason" TEXT,
    "followersNotifiedAt" TIMESTAMP(3),
    "dayReminderSentAt" TIMESTAMP(3),
    "soonReminderSentAt" TIMESTAMP(3),
    "liveNoticeSentAt" TIMESTAMP(3),
    "hostReminderSentAt" TIMESTAMP(3),
    "timeWarningSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveProduct" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "discountPercent" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LiveProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveInterest" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveMessage" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveBan" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_code_key" ON "LiveSession"("code");

-- CreateIndex
CREATE INDEX "LiveSession_status_scheduledAt_idx" ON "LiveSession"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "LiveSession_storeId_status_idx" ON "LiveSession"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LiveProduct_liveSessionId_productId_key" ON "LiveProduct"("liveSessionId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveInterest_liveSessionId_userId_key" ON "LiveInterest"("liveSessionId", "userId");

-- CreateIndex
CREATE INDEX "LiveMessage_liveSessionId_createdAt_idx" ON "LiveMessage"("liveSessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiveBan_liveSessionId_userId_key" ON "LiveBan"("liveSessionId", "userId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveProduct" ADD CONSTRAINT "LiveProduct_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveProduct" ADD CONSTRAINT "LiveProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveInterest" ADD CONSTRAINT "LiveInterest_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveInterest" ADD CONSTRAINT "LiveInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMessage" ADD CONSTRAINT "LiveMessage_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMessage" ADD CONSTRAINT "LiveMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveBan" ADD CONSTRAINT "LiveBan_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveBan" ADD CONSTRAINT "LiveBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

