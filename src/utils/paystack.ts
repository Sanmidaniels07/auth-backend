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
// revenue for this order, and whatever's left (commission + shipping + tax +
// stores without a subaccount) settles to the main account automatically.
export interface PaystackSplitConfig {
  type: "flat";
  currency: "NGN";
  bearer_type: "account";
  subaccounts: { subaccount: string; share: number }[];
}

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
