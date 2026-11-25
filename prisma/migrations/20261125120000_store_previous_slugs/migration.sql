-- Slugs a store had before a rename: old store links and short links keep working.
ALTER TABLE "Store" ADD COLUMN "previousSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[];
