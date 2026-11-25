-- A listed product that was just edited is off the marketplace for a few
-- minutes (UPDATING) until relistAt.
ALTER TYPE "ProductStatus" ADD VALUE 'UPDATING';
ALTER TABLE "Product" ADD COLUMN "relistAt" TIMESTAMP(3);
