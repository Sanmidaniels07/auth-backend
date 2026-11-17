import { z } from "zod";

const priceField = z.number().positive("Enter a price above ₦0.").max(100_000_000);
const noteField = z.string().trim().max(300).optional();

// A buyer's offer in a chat with a seller: for a listed product
// (productId) or something described (title).
export const createOfferSchema = z.object({
  body: z
    .object({
      conversationId: z.string().min(1),
      productId: z.string().min(1).optional(),
      title: z.string().trim().min(2, "Say what you'd like to buy.").max(120).optional(),
      price: priceField,
      quantity: z.number().int().min(1).max(1000).optional(),
      note: noteField,
    })
    .refine((body) => !!body.productId || !!body.title, { message: "Choose a product or say what you'd like to buy." }),
});

// Answering an offer. COUNTER needs a price. The seller also gives, when
// needed: the category (described items - sets the commission) and the
// delivery fee (stores without delivery zones).
export const respondOfferSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      action: z.enum(["ACCEPT", "DECLINE", "COUNTER"]),
      price: priceField.optional(),
      categoryId: z.string().min(1).optional(),
      deliveryFee: z.number().min(0).max(1_000_000).optional(),
      note: noteField,
    })
    .refine((body) => body.action !== "COUNTER" || body.price !== undefined, { message: "Enter your counter price." }),
});

export const offerIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>["body"];
export type RespondOfferInput = z.infer<typeof respondOfferSchema>["body"];
