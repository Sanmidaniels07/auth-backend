-- CreateEnum
CREATE TYPE "ShippingOptionType" AS ENUM ('DELIVERY', 'PICKUP');

-- AlterTable
ALTER TABLE "ShippingOption" ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "type" "ShippingOptionType" NOT NULL DEFAULT 'DELIVERY';

-- AlterTable
ALTER TABLE "OrderShipping" ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "type" "ShippingOptionType" NOT NULL DEFAULT 'DELIVERY';


-- Existing free, area-less options named like "Pickup" were how sellers
-- offered collection before this type existed - mark them as pickup.
UPDATE "ShippingOption"
SET "type" = 'PICKUP'
WHERE "fee" = 0
  AND cardinality("areas") = 0
  AND lower("name") ~ 'pick ?-?up|collect';
