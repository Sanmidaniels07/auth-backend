/*
  Warnings:

  - You are about to drop the column `etaDays` on the `OrderShipping` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrderShipping" DROP COLUMN "etaDays",
ADD COLUMN     "eta" TEXT;
