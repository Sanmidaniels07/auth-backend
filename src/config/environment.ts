// Which deployment this server is. Production doesn't set APP_ENV; the
// staging service sets APP_ENV=staging (see DEPLOYMENT.md). Only use this
// for behaviour that must differ on staging - everything else is driven by
// each environment's own variables (database, keys, URLs).
export const isStaging = process.env.APP_ENV === "staging";

// Comma-separated list, e.g. "https://staging.nestlyapp.site,https://x.y".
export const envList = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

// Browser origins are compared character-for-character, so a value pasted
// into a hosting dashboard with a trailing newline, quotes or slash would
// silently never match. Normalise before comparing.
export const normalizeOrigin = (value: string) =>
  value.trim().replace(/^["']|["']$/g, "").trim().replace(/\/+$/, "").toLowerCase();
