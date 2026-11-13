import { CacCompanyType } from "@prisma/client";

// Dojah (dojah.io) - CAC business lookup.
// Keys come from the Dojah dashboard (Developers -> Configuration): the App ID
// and the SECRET key, sent as-is (no "Bearer"). Sandbox (https://sandbox.dojah.io)
// returns made-up data for its test numbers (1261103, 14320749); live
// (https://api.dojah.io, the default) is charged per lookup.

const LOOKUP_TIMEOUT_MS = 10_000;

export const isDojahConfigured = () =>
  Boolean(process.env.DOJAH_APP_ID && process.env.DOJAH_SECRET_KEY);

const baseUrl = () => (process.env.DOJAH_BASE_URL || "https://api.dojah.io").replace(/\/+$/, "");

export type CacLookup =
  | { found: true; companyName: string; status: string }
  | { found: false };

/** Thrown when the lookup itself fails (network, keys, Dojah down) - not for "no such company". */
export class DojahError extends Error {}

// CAC numbers are often written with their register's prefix (RC1234567,
// BN 1234567, IT-12345). Dojah wants the digits plus the register.
const PREFIX_TYPES: [RegExp, CacCompanyType][] = [
  [/^LLP/, CacCompanyType.LIMITED_LIABILITY_PARTNERSHIP],
  [/^LP/, CacCompanyType.LIMITED_PARTNERSHIP],
  [/^BN/, CacCompanyType.BUSINESS_NAME],
  [/^IT/, CacCompanyType.INCORPORATED_TRUSTEES],
  [/^RC/, CacCompanyType.COMPANY],
];

/** The register a CAC number's prefix points to, if it has one. */
export const cacTypeFromNumber = (cacNumber: string): CacCompanyType | undefined =>
  PREFIX_TYPES.find(([prefix]) => prefix.test(cacNumber.toUpperCase()))?.[1];

/** The number without its register prefix, e.g. "RC1234567" -> "1234567". */
export const cacDigits = (cacNumber: string) => cacNumber.toUpperCase().replace(/^[A-Z]+/, "");

export const lookupCac = async (cacNumber: string, companyType: CacCompanyType): Promise<CacLookup> => {
  if (!isDojahConfigured()) {
    throw new DojahError("Dojah isn't configured (DOJAH_APP_ID / DOJAH_SECRET_KEY).");
  }

  const url = new URL(`${baseUrl()}/api/v1/kyc/cac/basic`);
  url.searchParams.set("rc_number", cacDigits(cacNumber));
  url.searchParams.set("company_type", companyType);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        AppId: process.env.DOJAH_APP_ID as string,
        Authorization: process.env.DOJAH_SECRET_KEY as string,
      },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
  } catch (error) {
    throw new DojahError(`Dojah CAC lookup didn't respond: ${(error as Error).message}`);
  }

  if (response.status === 404) return { found: false };

  const body = (await response.json().catch(() => null)) as
    | { entity?: { company_name?: string; status?: string }; error?: string }
    | null;

  if (!response.ok) {
    // Dojah reports some "not found" cases as 400 with an error message.
    if (response.status === 400 && /not\s*found|no record/i.test(body?.error ?? "")) {
      return { found: false };
    }
    throw new DojahError(`Dojah CAC lookup failed (${response.status})${body?.error ? `: ${body.error}` : ""}`);
  }

  const name = body?.entity?.company_name?.trim();
  if (!name) return { found: false };

  return { found: true, companyName: name, status: body?.entity?.status?.trim() ?? "" };
};

/** Whether the register's status counts as active ("ACTIVE", "Active" - not "Not Active", "INACTIVE"). */
export const isActiveCacStatus = (status: string) => /^active$/i.test(status.trim());

// Words that say what kind of entity it is rather than which one - left out
// when comparing a store name with the registered name.
const ENTITY_WORDS = new Set([
  "THE", "LIMITED", "LTD", "PLC", "NIG", "NIGERIA", "CO", "COMPANY", "ENTERPRISE",
  "ENTERPRISES", "LLP", "LP", "INCORPORATED", "TRUSTEES", "OF", "AND",
]);

const nameWords = (name: string) =>
  name
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((word) => word && !ENTITY_WORDS.has(word));

/**
 * Whether a store name is clearly the registered business: the same name
 * once entity words (Limited, Enterprises...) and punctuation are ignored,
 * or every word of one (at least two words) appears in the other - so
 * "Mama Put Kitchen" matches "MAMA PUT KITCHEN VENTURES". Anything less
 * certain goes to an admin.
 */
export const cacNameMatches = (storeName: string, registeredName: string) => {
  const store = nameWords(storeName);
  const registered = nameWords(registeredName);
  if (!store.length || !registered.length) return false;

  if (store.join("") === registered.join("")) return true;

  const [shorter, longer] = store.length <= registered.length ? [store, registered] : [registered, store];
  if (shorter.length < 2) return false;
  const longerSet = new Set(longer);
  return shorter.every((word) => longerSet.has(word));
};
