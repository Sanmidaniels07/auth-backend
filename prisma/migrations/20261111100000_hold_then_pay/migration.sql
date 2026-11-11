-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('MANUAL', 'TRANSFER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReturnRequestStatus" ADD VALUE 'REPLACEMENT';
ALTER TYPE "ReturnRequestStatus" ADD VALUE 'REPLACED';
ALTER TYPE "ReturnRequestStatus" ADD VALUE 'DISPUTED';
ALTER TYPE "ReturnRequestStatus" ADD VALUE 'WITHDRAWN';

-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "refundAmount" DOUBLE PRECISION,
ADD COLUMN     "refundStatus" "OrderRefundStatus",
ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT,
ADD COLUMN     "sellerRespondBy" TIMESTAMP(3),
ADD COLUMN     "sellerRespondedAt" TIMESTAMP(3),
ADD COLUMN     "sellerResponse" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "paystackRecipientCode" TEXT,
ADD COLUMN     "paystackRecipientFor" TEXT;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "bankLabel" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "method" "PayoutMethod" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "status" "PayoutStatus" NOT NULL DEFAULT 'PAID',
ADD COLUMN     "transferCode" TEXT,
ADD COLUMN     "transferReference" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "OrderShipping" ADD COLUMN     "heldForPayout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payoutId" TEXT,
ADD COLUMN     "settledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ReturnRequest_status_sellerRespondBy_idx" ON "ReturnRequest"("status", "sellerRespondBy");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_transferReference_key" ON "Payout"("transferReference");

-- CreateIndex
CREATE INDEX "Payout_storeId_createdAt_idx" ON "Payout"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Payout_status_createdAt_idx" ON "Payout"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderShipping_heldForPayout_settledAt_idx" ON "OrderShipping"("heldForPayout", "settledAt");

-- AddForeignKey
ALTER TABLE "OrderShipping" ADD CONSTRAINT "OrderShipping_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Reports already open when this shipped: the seller gets 48 hours from now to answer.
UPDATE "ReturnRequest" SET "sellerRespondBy" = NOW() + INTERVAL '48 hours' WHERE "status" = 'REQUESTED' AND "sellerRespondBy" IS NULL;
