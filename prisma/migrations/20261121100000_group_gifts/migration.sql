-- CreateEnum
CREATE TYPE "GroupGiftStatus" AS ENUM ('OPEN', 'FUNDED', 'CANCELLED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'REFUND_FAILED');

-- CreateTable
CREATE TABLE "GroupGift" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "recipientId" TEXT,
    "recipientName" TEXT NOT NULL,
    "message" TEXT,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT,
    "shippingOptionId" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "GroupGiftStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "giftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupGift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupGiftContribution" (
    "id" TEXT NOT NULL,
    "groupGiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "hideName" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReference" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupGiftContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupGift_code_key" ON "GroupGift"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GroupGift_giftId_key" ON "GroupGift"("giftId");

-- CreateIndex
CREATE INDEX "GroupGift_status_deadline_idx" ON "GroupGift"("status", "deadline");

-- CreateIndex
CREATE INDEX "GroupGift_organizerId_createdAt_idx" ON "GroupGift"("organizerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupGiftContribution_paymentReference_key" ON "GroupGiftContribution"("paymentReference");

-- CreateIndex
CREATE INDEX "GroupGiftContribution_groupGiftId_status_idx" ON "GroupGiftContribution"("groupGiftId", "status");

-- AddForeignKey
ALTER TABLE "GroupGift" ADD CONSTRAINT "GroupGift_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupGift" ADD CONSTRAINT "GroupGift_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupGift" ADD CONSTRAINT "GroupGift_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupGift" ADD CONSTRAINT "GroupGift_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupGift" ADD CONSTRAINT "GroupGift_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupGiftContribution" ADD CONSTRAINT "GroupGiftContribution_groupGiftId_fkey" FOREIGN KEY ("groupGiftId") REFERENCES "GroupGift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupGiftContribution" ADD CONSTRAINT "GroupGiftContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

