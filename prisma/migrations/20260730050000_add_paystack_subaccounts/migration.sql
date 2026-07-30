-- AlterTable
ALTER TABLE "Store" ADD COLUMN "payoutBankCode" TEXT;
ALTER TABLE "Store" ADD COLUMN "paystackSubaccountCode" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "autoPaidViaSplit" BOOLEAN NOT NULL DEFAULT false;
