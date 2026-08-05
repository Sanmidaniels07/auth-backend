-- AlterTable
ALTER TABLE "Store" ADD COLUMN "payoutAccountUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PayoutAccountChange" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "previousBankName" TEXT,
    "previousAccountNumber" TEXT,
    "newBankName" TEXT NOT NULL,
    "newAccountNumber" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutAccountChange_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PayoutAccountChange" ADD CONSTRAINT "PayoutAccountChange_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
