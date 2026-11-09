-- Returns policy (Nov 2026): 3-day window, 24 hours for perishables, reasons + photos.
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED', 'SPOILED', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'FAULTY', 'NOT_RECEIVED');

ALTER TABLE "ReturnRequest" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reasonType" "ReturnReason";

ALTER TABLE "Category" ADD COLUMN     "isPerishable" BOOLEAN NOT NULL DEFAULT false;

-- Food-type categories start out perishable; admins can change this.
UPDATE "Category" SET "isPerishable" = true WHERE "slug" IN ('cakes-pastries', 'food', 'grocery');
