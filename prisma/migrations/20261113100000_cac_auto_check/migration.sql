-- CreateEnum
CREATE TYPE "CacCompanyType" AS ENUM ('BUSINESS_NAME', 'COMPANY', 'INCORPORATED_TRUSTEES', 'LIMITED_PARTNERSHIP', 'LIMITED_LIABILITY_PARTNERSHIP');

-- CreateEnum
CREATE TYPE "CacCheckResult" AS ENUM ('VERIFIED', 'AWAITING_STORE', 'NAME_MISMATCH', 'INACTIVE', 'NOT_FOUND', 'FAILED');

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "cacCheckResult" "CacCheckResult",
ADD COLUMN     "cacCheckedAt" TIMESTAMP(3),
ADD COLUMN     "cacCheckedName" TEXT,
ADD COLUMN     "cacCheckedStatus" TEXT,
ADD COLUMN     "cacCompanyType" "CacCompanyType";

