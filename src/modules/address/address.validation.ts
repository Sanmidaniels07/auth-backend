import { z } from "zod";

const addressFields = {
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(1),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  country: z.string().trim().min(1),
  postalCode: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
};

export const createAddressSchema = z.object({
  body: z.object(addressFields),
});

export const updateAddressSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    ...addressFields,
    fullName: addressFields.fullName.optional(),
    phone: addressFields.phone.optional(),
    address: addressFields.address.optional(),
    city: addressFields.city.optional(),
    state: addressFields.state.optional(),
    country: addressFields.country.optional(),
  }),
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
