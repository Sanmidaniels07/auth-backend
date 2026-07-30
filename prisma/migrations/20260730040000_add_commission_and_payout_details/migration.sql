-- AlterTable
ALTER TABLE "Category" ADD COLUMN "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "payoutBankName" TEXT;
ALTER TABLE "Store" ADD COLUMN "payoutAccountNumber" TEXT;
ALTER TABLE "Store" ADD COLUMN "payoutAccountName" TEXT;
