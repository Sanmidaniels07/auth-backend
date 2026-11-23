import { z } from "zod";

// Photo-to-listing: the seller has already uploaded the photos (POST
// /api/uploads -> Cloudinary URLs); we send those URLs, 1-4 of them.
export const aiListingDraftSchema = z.object({
  body: z.object({
    imageUrls: z.array(z.string().trim().url()).min(1, "Add at least one photo.").max(4, "Use up to 4 photos."),
  }),
});

export type AiListingDraftInput = z.infer<typeof aiListingDraftSchema>["body"];
