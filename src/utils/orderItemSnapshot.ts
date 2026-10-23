import { ProductCondition } from "@prisma/client";

// What an order item remembers about the listing at the time of ordering
// (see OrderItem.product* in the schema). Sellers can keep editing the
// product; orders, emails and disputes show this copy instead.

interface SnapshotSource {
  title: string;
  description: string;
  brand: string | null;
  condition: ProductCondition;
  sku: string;
  highlights: string[];
  images: { url: string; isPrimary: boolean }[];
  specifications: { name: string; value: string }[];
}

export interface SpecEntry {
  name: string;
  value: string;
}

const primaryImage = (images: { url: string; isPrimary?: boolean }[] | undefined) =>
  (images?.find((image) => image.isPrimary) ?? images?.[0])?.url ?? null;

export const snapshotOf = (product: SnapshotSource) => ({
  productTitle: product.title,
  productImage: primaryImage(product.images),
  productDescription: product.description,
  productBrand: product.brand,
  productCondition: product.condition,
  productSku: product.sku,
  productHighlights: product.highlights,
  productSpecs: product.specifications.map(({ name, value }) => ({ name, value })),
});

interface SnapshotFields {
  productTitle: string | null;
  productImage: string | null;
}

// Shows the item as it was ordered: the copy's title and photo replace the
// live product's (the product id/slug still point at the current listing).
export const asOrdered = <T extends SnapshotFields & { product?: any }>(item: T): T => {
  if (!item.product || !item.productTitle) return item;

  const product = { ...item.product, title: item.productTitle };
  if (Array.isArray(item.product.images) && item.productImage) {
    product.images = [{ ...(item.product.images[0] ?? {}), url: item.productImage, isPrimary: true }];
  }

  return { ...item, product };
};

interface CurrentListing {
  title: string;
  description: string;
  brand: string | null;
  condition: ProductCondition;
  highlights: string[];
  images?: { url: string; isPrimary?: boolean }[];
  specifications: SpecEntry[];
}

const specsKey = (specs: SpecEntry[]) =>
  JSON.stringify(specs.map(({ name, value }) => [name.trim(), value.trim()]).sort());

// True when the seller has changed what the listing says since this item
// was ordered. Price is left out - the buyer's price is locked anyway.
export const listingChangedSince = (
  item: SnapshotFields & {
    productDescription: string | null;
    productBrand: string | null;
    productCondition: ProductCondition | null;
    productHighlights: string[];
    productSpecs: unknown;
  },
  current: CurrentListing
) => {
  if (!item.productTitle) return false;

  return (
    item.productTitle !== current.title ||
    (item.productDescription ?? "") !== current.description ||
    (item.productBrand ?? null) !== (current.brand ?? null) ||
    item.productCondition !== current.condition ||
    item.productHighlights.join("\n") !== current.highlights.join("\n") ||
    specsKey((item.productSpecs as SpecEntry[] | null) ?? []) !== specsKey(current.specifications) ||
    (current.images !== undefined && item.productImage !== primaryImage(current.images))
  );
};
