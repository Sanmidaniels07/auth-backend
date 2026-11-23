import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { DeliveryVehicle, ProductCondition, ProductStatus } from "@prisma/client";
import * as z from "zod/v4";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";
import { nigeriaToday } from "../../utils/birthday";
import { getSellerStore } from "../seller/seller.utils";

// Photo-to-listing: a seller's product photos -> a suggested title,
// description, category, condition, highlights and details for the add
// product form. The seller reviews and edits everything before saving.
// Claude looks at the photos; the price guide comes from real prices of
// similar products on Nestly, never from the AI.
//
// Off unless ANTHROPIC_API_KEY is set (the website hides the button).

const MODEL = () => process.env.AI_LISTING_MODEL || "claude-opus-5-5";
const dailyLimit = () => Number(process.env.AI_LISTING_DAILY_LIMIT) || 30;

export const aiListingEnabled = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

// Uses per seller per day (Nigeria time). In memory: one server process, and
// a restart only ever gives sellers a few extra tries.
const usage = new Map<string, { day: number; count: number }>();
const usedToday = (userId: string) => {
  const day = nigeriaToday().getTime();
  const entry = usage.get(userId);
  return entry && entry.day === day ? entry.count : 0;
};
const recordUse = (userId: string) => {
  const day = nigeriaToday().getTime();
  usage.set(userId, { day, count: usedToday(userId) + 1 });
};

export const aiListingStatusService = (userId: string) => ({
  enabled: aiListingEnabled(),
  remainingToday: Math.max(0, dailyLimit() - usedToday(userId)),
});

/** Only our own Cloudinary photos, shrunk to 1024px (enough to read a product, cheaper to send). */
const toModelImageUrl = (url: string) => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError("That photo link isn't valid.", 400);
  }
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com" || !cloud || !parsed.pathname.startsWith(`/${cloud}/image/upload/`)) {
    throw new AppError("Upload the photos to Nestly first.", 400);
  }
  parsed.pathname = parsed.pathname.replace("/image/upload/", "/image/upload/w_1024,h_1024,c_limit,q_auto,f_jpg/");
  return parsed.toString();
};

const SYSTEM = `You help sellers on Nestly, a Nigerian online marketplace, list a product from its photos.
Write for buyers in clear, friendly Nigerian English. Be accurate and specific to what the photos show.

Rules:
- Only state what you can see or what is certain from the photos (e.g. a printed brand name, colour, visible material, item type). Never invent sizes, weights, capacities, ingredients, materials, warranties or origin. Leave out anything you're unsure of - the seller will add it.
- Title: what a buyer would search for, under 80 characters, e.g. "Red Ankara Wrap Dress with Puff Sleeves". No prices, no emojis, no ALL CAPS, no words like "best" or "cheap".
- Description: 2-4 short paragraphs of plain text (no markdown, no emojis). What it is, what it looks like, who or what it's for. End with a short line asking buyers to check the details below or message the seller with questions.
- Highlights: 3-5 short selling points buyers care about, each under 60 characters.
- Specifications: only facts visible in the photos (e.g. Colour: Red, Pattern: Ankara print, Type: Wrap dress). Up to 8.
- Condition: NEW unless the photos clearly show use (USED) or it's food/cake/fresh items made for the order (FRESHLY_MADE).
- Delivery vehicle: BIKE for items a dispatch rider can carry, CAR for bulky items (e.g. large boxes, small furniture), TRUCK for very large items (e.g. fridges, beds).
- Never include prices, phone numbers, social handles, links or payment details.
- If the photos don't show a product for sale (e.g. a selfie, a screenshot, a document, something offensive), set isProduct to false, explain briefly in problem, and leave the other text fields empty.`;

const draftSchema = (categorySlugs: [string, ...string[]]) =>
  z.object({
    isProduct: z.boolean(),
    problem: z.string().describe("Why this can't be listed, if isProduct is false; otherwise empty."),
    title: z.string(),
    description: z.string(),
    categorySlug: z.enum(categorySlugs).describe("The closest category from the list."),
    brand: z.string().describe("Brand name only if clearly visible, otherwise empty."),
    condition: z.enum(["NEW", "USED", "REFURBISHED", "FRESHLY_MADE", "MADE_TO_ORDER", "PRE_ORDER"]),
    deliveryVehicle: z.enum(["BIKE", "CAR", "TRUCK"]),
    highlights: z.array(z.string()),
    specifications: z.array(z.object({ name: z.string(), value: z.string() })),
  });

/** Middle half of live prices in a category - a guide, only when there are enough to be meaningful. */
const priceGuide = async (categoryId: string) => {
  const rows = await prisma.product.findMany({
    where: { categoryId, status: ProductStatus.PUBLISHED, store: { isSuspended: false } },
    select: { price: true },
    orderBy: { price: "asc" },
    take: 500,
  });
  if (rows.length < 5) return null;
  const at = (q: number) => rows[Math.min(rows.length - 1, Math.floor(q * rows.length))].price;
  return { low: Math.round(at(0.25)), high: Math.round(at(0.75)), basedOn: rows.length };
};

const clean = (text: string, max: number) => text.replace(/\s+\n/g, "\n").trim().slice(0, max);

export const generateListingDraftService = async (userId: string, imageUrls: string[]) => {
  if (!aiListingEnabled()) throw new AppError("Photo-to-listing isn't available right now.", 503);
  await getSellerStore(userId); // approved sellers with a store only

  if (usedToday(userId) >= dailyLimit()) {
    throw new AppError("You've used today's photo-to-listing tries. Fill in the form, or try again tomorrow.", 429);
  }

  const images = imageUrls.map(toModelImageUrl);
  const categories = await prisma.category.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
  if (!categories.length) throw new AppError("No categories set up yet.", 503);
  const slugs = categories.map((category) => category.slug) as [string, ...string[]];

  recordUse(userId);

  let response;
  try {
    response = await anthropic().beta.messages.parse({
      model: MODEL(),
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(draftSchema(slugs)) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((url) => ({ type: "image" as const, source: { type: "url" as const, url } })),
            {
              type: "text" as const,
              text: `Categories (slug: name):\n${categories.map((c) => `${c.slug}: ${c.name}`).join("\n")}\n\nWrite the listing for the product in ${images.length === 1 ? "this photo" : "these photos"}.`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) throw new AppError("Photo-to-listing is busy. Try again in a minute.", 429);
    if (error instanceof Anthropic.BadRequestError) {
      console.error("AI listing request rejected:", error.message);
      throw new AppError("We couldn't read those photos. Try a clearer photo, or fill in the form.", 422);
    }
    console.error("AI listing failed:", error);
    throw new AppError("Photo-to-listing isn't available right now. Fill in the form instead.", 503);
  }

  const draft = response.parsed_output;
  if (response.stop_reason === "refusal" || !draft) {
    throw new AppError("We couldn't write a listing from these photos. Fill in the form instead.", 422);
  }
  if (!draft.isProduct) {
    throw new AppError(clean(draft.problem, 200) || "These photos don't look like a product for sale.", 422);
  }

  const category = categories.find((c) => c.slug === draft.categorySlug) ?? null;
  return {
    title: clean(draft.title, 120),
    description: clean(draft.description, 3000),
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
    brand: clean(draft.brand, 60),
    condition: draft.condition as ProductCondition,
    deliveryVehicle: draft.deliveryVehicle as DeliveryVehicle,
    highlights: draft.highlights.map((h) => clean(h, 80)).filter(Boolean).slice(0, 5),
    specifications: draft.specifications
      .map((s) => ({ name: clean(s.name, 40), value: clean(s.value, 80) }))
      .filter((s) => s.name && s.value)
      .slice(0, 8),
    priceGuide: category ? await priceGuide(category.id) : null,
    remainingToday: Math.max(0, dailyLimit() - usedToday(userId)),
  };
};
