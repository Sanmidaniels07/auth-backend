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
