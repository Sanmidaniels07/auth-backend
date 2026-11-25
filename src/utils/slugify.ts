export const slugify = (text: string): string => {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const generateUniqueSlug = async (
  base: string,
  isTaken: (slug: string) => Promise<boolean>
): Promise<string> => {
  const baseSlug = slugify(base);

  let slug = baseSlug;
  let counter = 1;

  while (await isTaken(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// Store slugs double as short links: nestlyapp.site/{slug}. These are the
// website's own top-level pages (and names kept for later), so a store
// can't be called one of them - it gets "login-1" instead.
export const RESERVED_STORE_SLUGS = new Set([
  "about", "account", "admin", "api", "app", "apple-icon", "blog", "cart", "chip-in", "checkout", "communities",
  "contact", "dashboard", "demo", "events", "explore", "faq", "features", "feed", "feeds", "followers", "following",
  "forgot-password", "gift", "guides", "hashtags", "help", "home", "icon", "live", "llms", "login", "logout", "me",
  "manifest", "marketplace", "messages", "nestly", "notifications", "orders", "partners", "pay", "post", "pricing",
  "privacy", "profile", "resend-verification", "reset-password", "robots", "s", "search", "sell", "seller",
  "seller-terms", "session-expired", "settings", "shop", "signup", "sitemap", "staging", "store", "stores",
  "support", "terms", "users", "verify-email", "welcome", "www",
]);
