-- CreateEnum
CREATE TYPE "DeliveryVehicle" AS ENUM ('BIKE', 'CAR', 'TRUCK');

-- AlterTable
ALTER TABLE "ShippingOption" ADD COLUMN     "vehicle" "DeliveryVehicle";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "deliveryVehicle" "DeliveryVehicle" NOT NULL DEFAULT 'BIKE';

-- AlterTable
ALTER TABLE "OrderShipping" ADD COLUMN     "vehicle" "DeliveryVehicle";

