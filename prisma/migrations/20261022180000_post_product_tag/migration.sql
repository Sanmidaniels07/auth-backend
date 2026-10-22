-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "productId" TEXT;

-- CreateIndex
CREATE INDEX "Post_productId_idx" ON "Post"("productId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
