import { z } from "zod";

export const stateLocationsSchema = z.object({
  params: z.object({
    state: z.string().trim().min(2).max(60),
  }),
});

export const reverseGeocodeSchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }),
});
