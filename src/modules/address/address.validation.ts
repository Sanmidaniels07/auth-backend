import { z } from "zod";

// Nigeria's bounding box, with a little margin - a pin outside it is a
// mistake (or a desktop's guessed location abroad).
const NIGERIA = { minLat: 4, maxLat: 14, minLng: 2.5, maxLng: 15 };

const addressFields = {
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(1),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  country: z.string().trim().min(1),
  postalCode: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
  // The map pin (Google Maps). null clears it, e.g. after typing a new
  // address by hand.
  latitude: z.number().min(NIGERIA.minLat).max(NIGERIA.maxLat).nullable().optional(),
  longitude: z.number().min(NIGERIA.minLng).max(NIGERIA.maxLng).nullable().optional(),
};

// A pin needs both halves.
const pinIsWhole = (body: { latitude?: number | null; longitude?: number | null }) =>
  (body.latitude == null) === (body.longitude == null);
const pinMessage = { message: "Send both latitude and longitude for the map pin, or neither.", path: ["latitude"] };

export const createAddressSchema = z.object({
  body: z.object(addressFields).refine(pinIsWhole, pinMessage),
});

export const updateAddressSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z
    .object({
      ...addressFields,
      fullName: addressFields.fullName.optional(),
      phone: addressFields.phone.optional(),
      address: addressFields.address.optional(),
      city: addressFields.city.optional(),
      state: addressFields.state.optional(),
      country: addressFields.country.optional(),
    })
    .refine(pinIsWhole, pinMessage),
});

export const deleteAddressSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export type CreateAddressInput = z.infer<
  typeof createAddressSchema
>["body"];

export type UpdateAddressInput = z.infer<
  typeof updateAddressSchema
>["body"];
