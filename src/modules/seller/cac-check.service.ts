import { CacCheckResult, Role } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { createNotificationService } from "../notification/notification.service";
import {
  cacNameMatches,
  cacTypeFromNumber,
  isActiveCacStatus,
  isDojahConfigured,
  lookupCac,
} from "../../utils/dojah";

// Automatic CAC verification. When a seller adds or changes their CAC number
// we look it up on the CAC register (via Dojah). An active business whose
// registered name matches the store name is verified straight away; anything
// else goes to the admins with what the register said, so they can decide.
// Without Dojah keys it falls back to the admins checking by hand.

const SELLER_SELECT = {
  id: true,
  userId: true,
  cacNumber: true,
  cacCompanyType: true,
  cacCheckResult: true,
  cacCheckedName: true,
  cacCheckedStatus: true,
  isVerified: true,
  user: { select: { name: true } },
  store: { select: { id: true, name: true } },
} as const;

type CheckedSeller = NonNullable<Awaited<ReturnType<typeof loadSeller>>>;

const loadSeller = (sellerProfileId: string) =>
  prisma.sellerProfile.findUnique({ where: { id: sellerProfileId }, select: SELLER_SELECT });

const notifyAdmins = async (sellerProfileId: string, title: string, message: string) => {
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
  for (const admin of admins) {
    createNotificationService(admin.id, title, message, undefined, {
      type: "ADMIN_CAC_SUBMITTED",
      id: sellerProfileId,
    }).catch((error) => console.error("Notification failed:", error));
  }
};

/** The result for a business the register knows, given the current store name. */
const matchResult = (seller: { store: { name: string } | null }, name: string, status: string) => {
  if (!isActiveCacStatus(status)) return CacCheckResult.INACTIVE;
  if (!seller.store) return CacCheckResult.AWAITING_STORE;
  return cacNameMatches(seller.store.name, name) ? CacCheckResult.VERIFIED : CacCheckResult.NAME_MISMATCH;
};

/** What the admins are told when a check needs a person. */
const adminMessage = (seller: CheckedSeller, result: CacCheckResult) => {
  const who = seller.user.name;
  const number = seller.cacNumber;
  const registered = `"${seller.cacCheckedName}"${seller.cacCheckedStatus ? ` (${seller.cacCheckedStatus})` : ""}`;
  switch (result) {
    case CacCheckResult.NAME_MISMATCH:
      return `${who}'s CAC number ${number} is registered to ${registered}, but their store is "${seller.store?.name}". Check it and verify by hand if it's theirs.`;
    case CacCheckResult.INACTIVE:
      return `${who}'s CAC number ${number} belongs to ${registered}, which isn't active on the CAC register.`;
    case CacCheckResult.NOT_FOUND:
      return `${who}'s CAC number ${number} wasn't found on the CAC register. Check it on the CAC public search.`;
    default:
      return `${who} added a CAC number (${number}) but the automatic check couldn't run - check it on the CAC register and verify their store.`;
  }
};

/**
 * Saves a check's result and acts on it: verifies the business (and the
 * store's badge) on a match, removes a verification that only came from an
 * earlier automatic match, and tells the admins when a person is needed.
 */
const applyResult = async (
  seller: CheckedSeller,
  result: CacCheckResult,
  checked: { name: string | null; status: string | null; at?: Date }
) => {
  const verify = result === CacCheckResult.VERIFIED;
  // A verification an admin gave by hand stays; one that came from an
  // earlier automatic match goes when the match no longer holds.
  const unverify = !verify && seller.isVerified && seller.cacCheckResult === CacCheckResult.VERIFIED;
  const isVerified = verify ? true : unverify ? false : seller.isVerified;

  await prisma.$transaction([
    prisma.sellerProfile.update({
      where: { id: seller.id },
      data: {
        cacCheckResult: result,
        cacCheckedName: checked.name,
        cacCheckedStatus: checked.status,
        ...(checked.at ? { cacCheckedAt: checked.at } : {}),
        isVerified,
      },
    }),
    ...(seller.store && isVerified !== seller.isVerified
      ? [prisma.store.update({ where: { id: seller.store.id }, data: { isVerified } })]
      : []),
  ]);

  const updated = { ...seller, cacCheckResult: result, cacCheckedName: checked.name, cacCheckedStatus: checked.status };

  if (verify && !seller.isVerified) {
    await createNotificationService(
      seller.userId,
      "Business verified",
      "Your business registration has been verified ✓ - buyers now see a verified badge on your store.",
      undefined,
      { type: "SELLER_APPLICATION", id: seller.id }
    );
  }

  if (!verify && result !== CacCheckResult.AWAITING_STORE) {
    await notifyAdmins(seller.id, "CAC number to check", adminMessage(updated, result));
  }

  return result;
};

/**
 * Looks the seller's CAC number up on the register and acts on it. Run
 * whenever the number (or its register) changes, and by admins to re-check.
 * Never throws - a failed lookup is recorded as FAILED and sent to admins.
 */
export const checkSellerCac = async (sellerProfileId: string) => {
  const seller = await loadSeller(sellerProfileId);
  if (!seller) return null;

  if (!seller.cacNumber) {
    await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: { cacCheckResult: null, cacCheckedName: null, cacCheckedStatus: null, cacCheckedAt: null },
    });
    return null;
  }

  if (!isDojahConfigured()) {
    // No automatic check here (e.g. production before the Dojah keys are
    // added): the admins check it by hand, as before.
    await notifyAdmins(
      seller.id,
      "CAC number to check",
      `${seller.user.name} added a CAC number - check it on the CAC register and verify their store.`
    );
    return null;
  }

  const companyType = seller.cacCompanyType ?? cacTypeFromNumber(seller.cacNumber) ?? "COMPANY";
  const at = new Date();

  try {
    const lookup = await lookupCac(seller.cacNumber, companyType);
    if (!lookup.found) {
      return await applyResult(seller, CacCheckResult.NOT_FOUND, { name: null, status: null, at });
    }
    return await applyResult(seller, matchResult(seller, lookup.companyName, lookup.status), {
      name: lookup.companyName,
      status: lookup.status,
      at,
    });
  } catch (error) {
    console.error("CAC check failed:", error);
    return applyResult(seller, CacCheckResult.FAILED, { name: null, status: null, at }).catch((saveError) => {
      console.error("Failed to save CAC check result:", saveError);
      return CacCheckResult.FAILED;
    });
  }
};

/**
 * Compares the store name with the registered name already on file - after
 * the seller creates or renames their store - without another paid lookup.
 */
export const recheckCacNameMatch = async (sellerProfileId: string) => {
  const seller = await loadSeller(sellerProfileId);
  if (!seller?.cacCheckedName || !seller.cacCheckedStatus) return null;

  const matchable: CacCheckResult[] = [
    CacCheckResult.VERIFIED,
    CacCheckResult.AWAITING_STORE,
    CacCheckResult.NAME_MISMATCH,
  ];
  if (!seller.cacCheckResult || !matchable.includes(seller.cacCheckResult)) return null;

  const result = matchResult(seller, seller.cacCheckedName, seller.cacCheckedStatus);
  // Already told the admins about this mismatch - don't repeat it.
  if (result === seller.cacCheckResult) return result;

  return applyResult(seller, result, { name: seller.cacCheckedName, status: seller.cacCheckedStatus });
};
