-- Wishlists can be shared with followers (gift ideas) or everyone; private by default.
CREATE TYPE "WishlistVisibility" AS ENUM ('PRIVATE', 'FOLLOWERS', 'EVERYONE');

ALTER TABLE "User" ADD COLUMN "wishlistVisibility" "WishlistVisibility" NOT NULL DEFAULT 'PRIVATE';
