import { OAuth2Client } from "google-auth-library";

import { AppError } from "./appError";

// The website's "Sign in with Google" OAuth client (Google Cloud project
// "Nestly"). Client IDs aren't secret; GOOGLE_CLIENT_ID can override it.
const DEFAULT_CLIENT_ID =
  "197293090775-bvip2bnb7jqk8700g1154b0585nl2s6c.apps.googleusercontent.com";

const clientId = () => process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;

const client = new OAuth2Client();

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Checks the ID token Google's sign-in button hands the website (signature,
 * expiry, issued for our client) and returns who it belongs to. Only
 * addresses Google has verified are accepted - that's what makes it safe to
 * link the Google account to an existing Nestly account with the same email.
 */
export const verifyGoogleCredential = async (credential: string): Promise<GoogleIdentity> => {
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId() });
    payload = ticket.getPayload();
  } catch {
    throw new AppError("Google sign-in failed. Please try again.", 401);
  }

  if (!payload?.sub || !payload.email) {
    throw new AppError("Google sign-in failed. Please try again.", 401);
  }
  if (!payload.email_verified) {
    throw new AppError("Your Google email address isn't verified yet.", 401);
  }

  const name = (payload.name || payload.given_name || payload.email.split("@")[0]).trim().slice(0, 60);

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: name.length >= 2 ? name : "Nestly member",
    picture: payload.picture,
  };
};
