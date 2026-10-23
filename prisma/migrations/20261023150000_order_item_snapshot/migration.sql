-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "productBrand" TEXT,
ADD COLUMN     "productCondition" "ProductCondition",
ADD COLUMN     "productDescription" TEXT,
ADD COLUMN     "productHighlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "productImage" TEXT,
ADD COLUMN     "productSku" TEXT,
ADD COLUMN     "productSpecs" JSONB,
ADD COLUMN     "productTitle" TEXT;

-- Backfill existing order items from their product as it is now (the best
-- record available for orders placed before snapshots existed).
UPDATE "OrderItem" oi
SET "productTitle"       = p."title",
    "productDescription" = p."description",
    "productBrand"       = p."brand",
    "productCondition"   = p."condition",
    "productSku"         = p."sku",
    "productHighlights"  = p."highlights",
    "productImage"       = (
      SELECT pi."url" FROM "ProductImage" pi
      WHERE pi."productId" = p."id"
      ORDER BY pi."isPrimary" DESC, pi."id" ASC
      LIMIT 1
    ),
    "productSpecs"       = (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', ps."name", 'value', ps."value") ORDER BY ps."id"), '[]'::jsonb)
      FROM "ProductSpecification" ps
      WHERE ps."productId" = p."id"
    )
FROM "Product" p
WHERE p."id" = oi."productId";
