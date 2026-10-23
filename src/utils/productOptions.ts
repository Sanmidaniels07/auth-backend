import { Prisma } from "@prisma/client";

import { AppError } from "./appError";

// Product options (e.g. Size, Colour) and their variations - one per
// combination, with its own stock and optional price. A product without
// options has no variations and works exactly as before.

export const MAX_OPTIONS = 2;

export interface OptionInput {
  name: string;
  values: string[];
}

export interface VariationInput {
  option1: string;
  option2?: string;
  price?: number | null;
  stock: number;
  isActive?: boolean;
}

interface OptionLike {
  name: string;
  position: number;
}

interface VariationLike {
  option1: string;
  option2: string;
  price: number | null;
}

// "Size: Large · Flavour: Vanilla"
export const variationLabel = (options: OptionLike[], variation: Pick<VariationLike, "option1" | "option2">) => {
  const sorted = [...options].sort((a, b) => a.position - b.position);
  return [variation.option1, variation.option2]
    .map((value, index) => (value && sorted[index] ? `${sorted[index].name}: ${value}` : value))
    .filter(Boolean)
    .join(" · ");
};

// What one unit costs: the variation's own price, else the product's.
export const unitPriceOf = (product: { price: number }, variation?: Pick<VariationLike, "price"> | null) =>
  variation?.price ?? product.price;

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Rejects options/variations that don't fit together, before anything is saved.
export const assertValidOptions = (options: OptionInput[], variations: VariationInput[]) => {
  if (options.length > MAX_OPTIONS) {
    throw new AppError(`A product can have at most ${MAX_OPTIONS} options.`, 400);
  }

  options.forEach((option, index) => {
    if (options.some((other, i) => i !== index && sameText(other.name, option.name))) {
      throw new AppError(`Two options are both called "${option.name}".`, 400);
    }
    option.values.forEach((value, i) => {
      if (option.values.some((other, j) => j !== i && sameText(other, value))) {
        throw new AppError(`"${value}" is listed twice under ${option.name}.`, 400);
      }
    });
  });

  if (options.length === 0) {
    if (variations.length > 0) throw new AppError("Add an option before adding variations.", 400);
    return;
  }

  const seen = new Set<string>();
  for (const variation of variations) {
    const second = variation.option2 ?? "";
    if (!options[0].values.includes(variation.option1)) {
      throw new AppError(`"${variation.option1}" isn't one of the ${options[0].name} values.`, 400);
    }
    if (options[1] ? !options[1].values.includes(second) : second !== "") {
      throw new AppError(`"${second}" isn't one of the ${options[1]?.name ?? "option"} values.`, 400);
    }
    const key = `${variation.option1}\u0000${second}`;
    if (seen.has(key)) throw new AppError("Each combination can only be listed once.", 400);
    seen.add(key);
  }

  if (!variations.some((variation) => variation.isActive !== false)) {
    throw new AppError("Turn on at least one combination buyers can choose.", 400);
  }
};

// Replaces a product's options and variations. Combinations that already
// have orders are archived (hidden from buyers) instead of deleted, so past
// orders keep pointing at them. Returns the total stock of active
// variations, or null when the product no longer has options.
export const saveProductOptions = async (
  tx: Prisma.TransactionClient,
  productId: string,
  options: OptionInput[],
  variations: VariationInput[]
): Promise<number | null> => {
  const existing = await tx.productVariation.findMany({
    where: { productId },
    include: { _count: { select: { orderItems: true } } },
  });

  await tx.productOption.deleteMany({ where: { productId } });
  if (options.length > 0) {
    await tx.productOption.createMany({
      data: options.map((option, position) => ({ productId, name: option.name, values: option.values, position })),
    });
  }

  const keyOf = (option1: string, option2: string) => `${option1}\u0000${option2}`;
  const incoming = new Map(variations.map((variation) => [keyOf(variation.option1, variation.option2 ?? ""), variation]));

  for (const row of existing) {
    const next = incoming.get(keyOf(row.option1, row.option2));
    if (next) {
      await tx.productVariation.update({
        where: { id: row.id },
        data: { price: next.price ?? null, stock: next.stock, isActive: next.isActive ?? true, isArchived: false },
      });
      incoming.delete(keyOf(row.option1, row.option2));
    } else if (row._count.orderItems > 0) {
      await tx.productVariation.update({ where: { id: row.id }, data: { isActive: false, isArchived: true } });
    } else {
      await tx.productVariation.delete({ where: { id: row.id } });
    }
  }

  if (incoming.size > 0) {
    await tx.productVariation.createMany({
      data: Array.from(incoming.values()).map((variation) => ({
        productId,
        option1: variation.option1,
        option2: variation.option2 ?? "",
        price: variation.price ?? null,
        stock: variation.stock,
        isActive: variation.isActive ?? true,
      })),
    });
  }

  if (options.length === 0) return null;

  return variations
    .filter((variation) => variation.isActive !== false)
    .reduce((sum, variation) => sum + variation.stock, 0);
};

// What buyers and sellers get back about a product's options.
export const OPTIONS_INCLUDE = {
  options: { orderBy: { position: "asc" as const } },
  variations: {
    where: { isArchived: false },
    orderBy: { createdAt: "asc" as const },
    select: { id: true, option1: true, option2: true, price: true, stock: true, isActive: true },
  },
};
