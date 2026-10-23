-- CreateTable
CREATE TABLE "OrderSellerNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderSellerNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderSellerNote_storeId_idx" ON "OrderSellerNote"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderSellerNote_orderId_storeId_key" ON "OrderSellerNote"("orderId", "storeId");

-- AddForeignKey
ALTER TABLE "OrderSellerNote" ADD CONSTRAINT "OrderSellerNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSellerNote" ADD CONSTRAINT "OrderSellerNote_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
