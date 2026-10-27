-- CreateEnum
CREATE TYPE "OrderRefundStatus" AS ENUM ('REQUESTED', 'FAILED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "refundStatus" "OrderRefundStatus";

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

