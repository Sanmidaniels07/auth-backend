-- CreateEnum
CREATE TYPE "DeliveryConfirmation" AS ENUM ('CODE', 'BUYER', 'AUTO');

-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM ('PLACED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CONFIRMED', 'CANCELLED', 'PROBLEM_REPORTED');

-- CreateEnum
CREATE TYPE "OrderEventActor" AS ENUM ('BUYER', 'SELLER', 'SYSTEM');

-- AlterTable
ALTER TABLE "OrderShipping" ADD COLUMN     "deliveryCode" TEXT,
ADD COLUMN     "deliveryCodeAttempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryConfirmedBy" "DeliveryConfirmation",
ADD COLUMN     "shippedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "type" "OrderEventType" NOT NULL,
    "actor" "OrderEventActor" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

