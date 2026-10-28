import { TrafficSource } from "@prisma/client";
import { z } from "zod";

// Where the visitor came from, as worked out by the website (see
// TrafficSource in the schema). Optional and only ever used for the admin
// overview's counts, so an unknown value is dropped rather than refused.
export const trafficSourceField = z
  .nativeEnum(TrafficSource)
  .optional()
  .catch(undefined);
