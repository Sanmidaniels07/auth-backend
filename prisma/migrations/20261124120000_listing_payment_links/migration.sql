-- Pay links for products listed in the shop (PaymentLink.fromListing).
ALTER TABLE "PaymentLink" ADD COLUMN "fromListing" BOOLEAN NOT NULL DEFAULT false;
