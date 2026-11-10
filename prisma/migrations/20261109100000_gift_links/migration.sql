-- Gift links: the sender pays, the recipient adds their own address.
CREATE TYPE "GiftStatus" AS ENUM ('UNPAID', 'SENT', 'CLAIMED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- A gift has no address until the recipient claims it.
ALTER TABLE "Order" ALTER COLUMN "addressId" DROP NOT NULL;

CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "recipientName" TEXT NOT NULL,
    "message" TEXT,
    "showPrice" BOOLEAN NOT NULL DEFAULT false,
    "deliveryState" TEXT,
    "deliveryAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "GiftStatus" NOT NULL DEFAULT 'UNPAID',
    "expiresAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Gift_code_key" ON "Gift"("code");
CREATE UNIQUE INDEX "Gift_orderId_key" ON "Gift"("orderId");
CREATE INDEX "Gift_status_expiresAt_idx" ON "Gift"("status", "expiresAt");
CREATE INDEX "Gift_senderId_createdAt_idx" ON "Gift"("senderId", "createdAt");
CREATE INDEX "Gift_recipientId_createdAt_idx" ON "Gift"("recipientId", "createdAt");

ALTER TABLE "Gift" ADD CONSTRAINT "Gift_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
