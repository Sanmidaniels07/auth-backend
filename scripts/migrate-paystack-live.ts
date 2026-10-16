// One-off: move stores from Paystack test mode to live mode.
//
// Subaccount codes and saved-card authorization codes created with the test
// key don't exist in live mode, so any checkout that uses them fails. This
// re-creates a live subaccount for every store with saved bank details and
// clears the test saved cards.
//
// Safe to re-run: stores whose current code already exists in live mode are
// skipped. payoutAccountUpdatedAt is left untouched - the bank account isn't
// changing, so sellers shouldn't land on the 48h payout hold.
//
// Usage (from auth-backend/, with the LIVE key and production DATABASE_URL in .env):
//   npx ts-node-dev --transpile-only scripts/migrate-paystack-live.ts            (dry run)
//   npx ts-node-dev --transpile-only scripts/migrate-paystack-live.ts --apply
//   add --clear-cards (first run only) to also delete the test-mode saved cards

import dotenv from "dotenv";
dotenv.config();

import prisma from "../src/prisma/prisma";
import { createOrUpdateSubaccount } from "../src/utils/paystack";

const APPLY = process.argv.includes("--apply");
// Separate flag so a re-run later doesn't wipe cards saved in live mode.
const CLEAR_CARDS = process.argv.includes("--clear-cards");

const subaccountExistsInLive = async (code: string) => {
  const response = await fetch(
    `https://api.paystack.co/subaccount/${encodeURIComponent(code)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  return response.ok;
};

const main = async () => {
  if (!process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_")) {
    throw new Error("PAYSTACK_SECRET_KEY is not a live key (sk_live_...). Aborting.");
  }

  const dbHost = new URL(process.env.DATABASE_URL as string).host;
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN (pass --apply to write)"}`);
  console.log(`Database: ${dbHost}\n`);

  const stores = await prisma.store.findMany({
    where: {
      payoutBankCode: { not: null },
      payoutAccountNumber: { not: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      payoutBankCode: true,
      payoutAccountNumber: true,
      paystackSubaccountCode: true,
    },
  });

  console.log(`Stores with bank details: ${stores.length}\n`);

  const failed: { slug: string; reason: string }[] = [];
  let migrated = 0;
  let skipped = 0;

  for (const store of stores) {
    if (
      store.paystackSubaccountCode &&
      (await subaccountExistsInLive(store.paystackSubaccountCode))
    ) {
      console.log(`SKIP     ${store.slug} - ${store.paystackSubaccountCode} already live`);
      skipped++;
      continue;
    }

    if (!APPLY) {
      console.log(
        `WOULD    ${store.slug} - create live subaccount (old: ${store.paystackSubaccountCode ?? "none"})`
      );
      migrated++;
      continue;
    }

    try {
      // existingSubaccountCode deliberately omitted - the old code is a test
      // one, so this must create a fresh subaccount rather than update.
      const subaccount = await createOrUpdateSubaccount({
        businessName: store.name,
        bankCode: store.payoutBankCode as string,
        accountNumber: store.payoutAccountNumber as string,
      });

      await prisma.store.update({
        where: { id: store.id },
        data: { paystackSubaccountCode: subaccount.subaccount_code },
      });

      console.log(`DONE     ${store.slug} - ${subaccount.subaccount_code}`);
      migrated++;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      // Clear the dead test code so checkout routes this store's revenue to
      // the manual Payout ledger instead of failing outright.
      await prisma.store.update({
        where: { id: store.id },
        data: { paystackSubaccountCode: null },
      });

      console.log(`FAILED   ${store.slug} - ${reason}`);
      failed.push({ slug: store.slug, reason });
    }
  }

  const savedCardCount = await prisma.savedCard.count();

  if (!CLEAR_CARDS) {
    console.log(`\nSaved cards: ${savedCardCount} (untouched - pass --clear-cards to delete)`);
  } else if (APPLY) {
    await prisma.savedCard.deleteMany({});
    console.log(`\nDeleted ${savedCardCount} saved card(s).`);
  } else {
    console.log(`\nWould delete ${savedCardCount} saved card(s).`);
  }

  console.log(
    `\nSummary: ${migrated} ${APPLY ? "migrated" : "to migrate"}, ${skipped} already live, ${failed.length} failed`
  );

  if (failed.length) {
    console.log("\nAsk these sellers to re-enter their bank details in Settings:");
    failed.forEach((f) => console.log(`  - ${f.slug}: ${f.reason}`));
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
