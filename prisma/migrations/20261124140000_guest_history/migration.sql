-- Guest checkout history (admin guest list).
ALTER TABLE "User" ADD COLUMN "guestSince" TIMESTAMP(3),
ADD COLUMN "guestJoinedAt" TIMESTAMP(3),
ADD COLUMN "guestDeclinedAt" TIMESTAMP(3);

-- Everyone who has checked out as a guest so far (still a guest, or since
-- turned into a full account - when isn't known for those).
UPDATE "User" SET "guestSince" = "createdAt"
WHERE "isGuest" = true
   OR "id" IN (SELECT "userId" FROM "Order" WHERE "guestAccessToken" IS NOT NULL);
