-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "guestAccessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_guestAccessToken_key" ON "Order"("guestAccessToken");

