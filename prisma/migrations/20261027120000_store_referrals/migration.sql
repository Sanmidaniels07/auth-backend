-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referredAt" TIMESTAMP(3),
ADD COLUMN     "referredByStoreId" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "referralCode" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "referralReward" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ReferralVisit" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferralVisit_storeId_createdAt_idx" ON "ReferralVisit"("storeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Store_referralCode_key" ON "Store"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByStoreId_fkey" FOREIGN KEY ("referredByStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralVisit" ADD CONSTRAINT "ReferralVisit_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every existing store gets a referral code.
UPDATE "Store" SET "referralCode" = upper(substr(md5(random()::text || "id"), 1, 8)) WHERE "referralCode" IS NULL;
