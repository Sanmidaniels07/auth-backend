/*
  Warnings:

  - You are about to drop the column `etaDays` on the `ShippingOption` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ShippingOption" DROP COLUMN "etaDays",
ADD COLUMN     "eta" TEXT;
