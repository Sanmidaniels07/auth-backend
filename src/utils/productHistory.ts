import { Prisma } from "@prisma/client";

// Edit history for products (admin-only) and the "earlier version" rule for
// reviews. Values are stored readable ("₦2,000", "Size: S, M") so the log
// still makes sense after categories or options are renamed.

export interface HistoryChange {
  field: string;
  from: string | string[] | null;
  to: string | string[] | null;
}

interface HistorySource {
  title: string;
  description: string;
  price: number;
  originalPrice: number | null;
  stock: number;
  status: string;
  condition: string;
  brand: string | null;
  sku: string;
  categoryId: string;
  category?: { name: string } | null;
  highlights: string[];
  images: { url: string; isPrimary: boolean }[];
  specifications: { name: string; value: string }[];
  options?: { name: string; values: string[]; position: number }[];
  variations?: { option1: string; option2: string; price: number | null; stock: number; isActive: boolean }[];
}

const naira = (value: number | null) =>
  value == null
    ? null
    : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

const photosOf = (images: HistorySource["images"]) =>
  [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)).map((image) => image.url);

// The product as a set of readable fields.
const historyState = (product: HistorySource): Record<string, string | string[] | null> => {
  const options = [...(product.options ?? [])].sort((a, b) => a.position - b.position);

  return {
    Title: product.title,
    Description: product.description,
    Price: naira(product.price),
    "Compare-at price": naira(product.originalPrice),
    Stock: String(product.stock),
    Status: product.status,
    Condition: product.condition,
    Brand: product.brand || null,
    SKU: product.sku,
    Category: product.category?.name ?? product.categoryId,
    Highlights: product.highlights.length ? product.highlights.join("; ") : null,
    Specifications: product.specifications.length
      ? product.specifications.map((spec) => `${spec.name}: ${spec.value}`).join("; ")
      : null,
    Photos: photosOf(product.images),
    Options: options.length ? options.map((option) => `${option.name}: ${option.values.join(", ")}`).join(" · ") : null,
    Combinations: product.variations?.length
      ? product.variations
          .map(
            (v) =>
              `${[v.option1, v.option2].filter(Boolean).join(" / ")} - ${naira(v.price) ?? "main price"}, ${v.stock} in stock${
                v.isActive ? "" : " (off)"
              }`
          )
          .join("; ")
      : null,
  };
};

const same = (a: string | string[] | null, b: string | string[] | null) => JSON.stringify(a) === JSON.stringify(b);

export const diffProducts = (before: HistorySource, after: HistorySource): HistoryChange[] => {
  const from = historyState(before);
  const to = historyState(after);
  return Object.keys(to)
    .filter((field) => !same(from[field], to[field]))
    .map((field) => ({ field, from: from[field], to: to[field] }));
};

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((word) => word.length > 1)
  );

// Share of words two titles have in common (0-1).
export const titleSimilarity = (a: string, b: string) => {
  const left = words(a);
  const right = words(b);
  if (left.size === 0 && right.size === 0) return 1;
  const shared = [...left].filter((word) => right.has(word)).length;
  return shared / new Set([...left, ...right]).size;
};

// A new category, or a title that's mostly different, means the listing is
// now a different product - its old reviews are for an earlier version.
export const isDifferentProduct = (before: Pick<HistorySource, "title" | "categoryId">, after: Pick<HistorySource, "title" | "categoryId">) =>
  before.categoryId !== after.categoryId || titleSimilarity(before.title, after.title) < 0.5;

export const recordProductRevision = (
  client: Prisma.TransactionClient,
  data: { productId: string; editedById: string; changes: HistoryChange[]; reviewsReset?: boolean }
) =>
  client.productRevision.create({
    data: {
      productId: data.productId,
      editedById: data.editedById,
      changes: data.changes as unknown as Prisma.InputJsonValue,
      reviewsReset: data.reviewsReset ?? false,
    },
  });

// Status-only edits (bulk publish/unpublish, archive).
export const recordStatusChanges = async (
  client: Prisma.TransactionClient,
  editedById: string,
  products: { id: string; status: string }[],
  status: string
) => {
  const changed = products.filter((product) => product.status !== status);
  if (changed.length === 0) return;
  await client.productRevision.createMany({
    data: changed.map((product) => ({
      productId: product.id,
      editedById,
      changes: [{ field: "Status", from: product.status, to: status }] as unknown as Prisma.InputJsonValue,
    })),
  });
};
