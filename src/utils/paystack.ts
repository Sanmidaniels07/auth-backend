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

interface InitializeTransactionParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
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
    }),
  });

  return json.data;
};

interface VerifyTransactionResult {
  status: string;
  amount: number;
  reference: string;
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
