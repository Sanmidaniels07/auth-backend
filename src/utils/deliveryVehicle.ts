import { DeliveryVehicle, ShippingOptionType } from "@prisma/client";

// Which delivery zones can carry which products. A bigger vehicle carries
// anything a smaller one can, so a product that needs a car can go by car
// or truck, never by bike. Zones without a vehicle (made before vehicles
// existed) and pickup take anything.

const RANK: Record<DeliveryVehicle, number> = { BIKE: 0, CAR: 1, TRUCK: 2 };

export const VEHICLE_LABEL: Record<DeliveryVehicle, string> = {
  BIKE: "dispatch bike",
  CAR: "car",
  TRUCK: "truck",
};

// The biggest vehicle any of these products needs.
export const requiredVehicle = (products: { deliveryVehicle: DeliveryVehicle }[]): DeliveryVehicle =>
  products.reduce<DeliveryVehicle>(
    (needed, product) => (RANK[product.deliveryVehicle] > RANK[needed] ? product.deliveryVehicle : needed),
    DeliveryVehicle.BIKE
  );

export const canCarry = (
  option: { type: ShippingOptionType; vehicle: DeliveryVehicle | null },
  needed: DeliveryVehicle
) => option.type === ShippingOptionType.PICKUP || option.vehicle === null || RANK[option.vehicle] >= RANK[needed];
