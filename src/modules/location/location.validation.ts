import { z } from "zod";

export const stateLocationsSchema = z.object({
  params: z.object({
    state: z.string().trim().min(2).max(60),
  }),
});

export const searchPlacesSchema = z.object({
  query: z.object({
    q: z.string().trim().max(60).optional(),
    limit: z.coerce.number().int().min(1).max(20).optional(),
  }),
});

export const reverseGeocodeSchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }),
});
