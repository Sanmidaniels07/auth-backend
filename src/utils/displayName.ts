import { z } from "zod";

// Names are shown publicly on profiles, posts and orders, so an email or a
// link typed into the name box would expose it to everyone.
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const LINK_LIKE = /(https?:\/\/|www\.)/i;

/** Display name for signup and profile edits: 2-60 chars, not an email or a link. */
export const displayNameField = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(60, "Name must be 60 characters or fewer.")
  .refine((name) => !EMAIL_LIKE.test(name), "Please enter your name, not your email address.")
  .refine((name) => !LINK_LIKE.test(name), "Please enter your name, not a link.");
