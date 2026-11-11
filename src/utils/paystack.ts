import crypto from "crypto";

import { AppError } from "./appError";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const paystackFetch = async (
  path: string,
  options: RequestInit = {}
) => {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = await response.json();

  if (!response.ok || !json.status) {
    throw new AppError(
      json.message || "Payment provider error.",
      502
    );
  }

  return json;
};

// A per-transaction split, built fresh for each checkout from whichever
// stores in the cart have a Paystack subaccount. `share` is a flat kobo
// amount (not a percentage) - each subaccount gets exactly its net-of-commission
// revenue plus its own delivery fee for this order, and whatever's left
// (commission + tax + stores without a subaccount) settles to the main
// account automatically. Nestly covers Paystack's fee ("account" - the main
// account bears it) whenever its part of the order can pay it; otherwise
// "all-proportional" splits the fee by what each party receives.
export interface PaystackSplitConfig {
  type: "flat";
  currency: "NGN";
  bearer_type: "account" | "all-proportional";
  subaccounts: { subaccount: string; share: number }[];
}

// Paystack's local (Nigerian card / transfer) pricing: 1.5% + ₦100, the
// ₦100 waived under ₦2,500, capped at ₦2,000. Only used to check Nestly's
// share of an order can cover the fee - Paystack deducts the real one.
// Update if Paystack's pricing changes.
export const estimatePaystackFeeKobo = (amountKobo: number) => {
  const naira = amountKobo / 100;
  const fee = naira * 0.015 + (naira >= 2500 ? 100 : 0);
  return Math.ceil(Math.min(fee, 2000) * 100);
};

interface InitializeTransactionParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
  split?: PaystackSplitConfig;
}

interface InitializeTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export const initializePaystackTransaction = async (
  params: InitializeTransactionParams
): Promise<InitializeTransactionResult> => {
  const json = await paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      split: params.split,
    }),
  });

  return json.data;
};

interface PaystackAuthorization {
  authorization_code: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  bank: string | null;
  card_type: string | null;
  reusable: boolean;
}

interface VerifyTransactionResult {
  status: string;
  amount: number;
  reference: string;
  authorization?: PaystackAuthorization;
}

export const verifyPaystackTransaction = async (
  reference: string
): Promise<VerifyTransactionResult> => {
  const json = await paystackFetch(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" }
  );

  return json.data;
};

/**
 * Full refund of a successful transaction back to the buyer's card/bank.
 * Paystack queues it and processes it within a few business days; it
 * comes out of the main account's balance.
 */
export const refundPaystackTransaction = async (reference: string, amountKobo?: number) => {
  const json = await paystackFetch("/refund", {
    method: "POST",
    // Without an amount Paystack refunds the whole payment; with one, just
    // that part of it (one item of a bigger order).
    body: JSON.stringify(amountKobo ? { transaction: reference, amount: amountKobo } : { transaction: reference }),
  });

  return json.data as { status: string; transaction?: { reference: string } };
};

// ---- Transfers (automatic seller payouts) ------------------------------
// Needs Transfers enabled on the Paystack business, OTP for transfers
// turned off (Settings > Preferences), and money in the Paystack balance.

/** A bank account Paystack can send money to. Returns its recipient code. */
export const createTransferRecipient = async (params: { name: string; accountNumber: string; bankCode: string }) => {
  const json = await paystackFetch("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: "NGN",
    }),
  });
  return json.data.recipient_code as string;
};

export interface TransferResult {
  // success: sent. pending / received: Paystack is processing it (a webhook
  // follows). otp: transfer OTP is still on, so nothing was sent. failed /
  // reversed: didn't go through.
  status: "success" | "pending" | "received" | "otp" | "failed" | "reversed" | "abandoned" | "blocked" | "rejected";
  transfer_code: string;
  reference: string;
  reason?: string;
}

/** Sends money from the Paystack balance to a recipient. `reference` makes retries safe. */
export const initiateTransfer = async (params: { amountKobo: number; recipient: string; reference: string; reason: string }) => {
  const json = await paystackFetch("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: params.amountKobo,
      recipient: params.recipient,
      reference: params.reference,
      reason: params.reason,
      currency: "NGN",
    }),
  });
  return json.data as TransferResult;
};

/** Where a transfer stands now (for ones still pending). */
export const verifyTransfer = async (reference: string) => {
  const json = await paystackFetch(`/transfer/verify/${encodeURIComponent(reference)}`, { method: "GET" });
  return json.data as TransferResult;
};

interface ChargeAuthorizationParams {
  email: string;
  amountKobo: number;
  reference: string;
  authorizationCode: string;
  split?: PaystackSplitConfig;
}

interface ChargeAuthorizationResult {
  status: string;
  reference: string;
  amount: number;
}

export const chargeAuthorization = async (
  params: ChargeAuthorizationParams
): Promise<ChargeAuthorizationResult> => {
  const json = await paystackFetch(
    "/transaction/charge_authorization",
    {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        reference: params.reference,
        authorization_code: params.authorizationCode,
        split: params.split,
      }),
    }
  );

  return json.data;
};

export interface PaystackBank {
  name: string;
  code: string;
}

let bankListCache: { banks: PaystackBank[]; fetchedAt: number } | null = null;
const BANK_LIST_TTL_MS = 24 * 60 * 60 * 1000;

export const listPaystackBanks = async (): Promise<PaystackBank[]> => {
  if (bankListCache && Date.now() - bankListCache.fetchedAt < BANK_LIST_TTL_MS) {
    return bankListCache.banks;
  }

  const json = await paystackFetch(
    "/bank?country=nigeria&currency=NGN",
    { method: "GET" }
  );

  const banks: PaystackBank[] = json.data.map(
    (bank: { name: string; code: string }) => ({
      name: bank.name,
      code: bank.code,
    })
  );

  bankListCache = { banks, fetchedAt: Date.now() };

  return banks;
};

interface ResolvedAccount {
  account_number: string;
  account_name: string;
}

export const resolveBankAccount = async (
  accountNumber: string,
  bankCode: string
): Promise<ResolvedAccount> => {
  const json = await paystackFetch(
    `/bank/resolve?account_number=${encodeURIComponent(
      accountNumber
    )}&bank_code=${encodeURIComponent(bankCode)}`,
    { method: "GET" }
  );

  return json.data;
};

interface SubaccountParams {
  businessName: string;
  bankCode: string;
  accountNumber: string;
  existingSubaccountCode?: string | null;
}

interface SubaccountResult {
  subaccount_code: string;
}

// Percentage_charge is required by Paystack but irrelevant here - every
// checkout passes its own explicit flat split, which overrides it.
const SUBACCOUNT_PLACEHOLDER_CHARGE = 0;

export const createOrUpdateSubaccount = async (
  params: SubaccountParams
): Promise<SubaccountResult> => {
  const body = JSON.stringify({
    business_name: params.businessName,
    bank_code: params.bankCode,
    account_number: params.accountNumber,
    percentage_charge: SUBACCOUNT_PLACEHOLDER_CHARGE,
  });

  const json = params.existingSubaccountCode
    ? await paystackFetch(
        `/subaccount/${params.existingSubaccountCode}`,
        { method: "PUT", body }
      )
    : await paystackFetch("/subaccount", { method: "POST", body });

  return json.data;
};

export const verifyPaystackWebhookSignature = (
  rawBody: Buffer,
  signature: string | undefined
): boolean => {
  if (!signature) return false;

  const hash = crypto
    .createHmac(
      "sha512",
      process.env.PAYSTACK_SECRET_KEY as string
    )
    .update(rawBody)
    .digest("hex");

  return hash === signature;
};
