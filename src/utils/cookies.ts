import { CookieOptions } from "express";

export const REFRESH_COOKIE_NAME = "refreshToken";

const isProduction = process.env.NODE_ENV === "production";

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/api/session",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Must mirror the options used to set the cookie (minus maxAge) for the
// browser to actually clear it.
export const clearRefreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/api/session",
};
