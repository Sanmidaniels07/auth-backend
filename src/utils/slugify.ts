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
