-- Map pin for delivery addresses (null when typed by hand).
ALTER TABLE "Address" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;
