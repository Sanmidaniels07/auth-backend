// Hides ways to reach someone outside Nestly - phone numbers (and bank
// account numbers, which look the same), emails, @handles and links to
// WhatsApp, Instagram, Facebook, TikTok, Telegram, X and Snapchat - so
// conversations and payments between buyers and sellers stay in the app.
// Each match becomes CONTACT_MASK, which the app shows as a blurred chip.

export const CONTACT_MASK = "••••••";

const PATTERNS: RegExp[] = [
  // Social / chat links (before handles and emails, which they can contain).
  /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|(?:api|chat)\.whatsapp\.com|whatsapp\.com|instagram\.com|instagr\.am|facebook\.com|fb\.com|fb\.me|m\.me|tiktok\.com|vm\.tiktok\.com|t\.me|telegram\.me|twitter\.com|x\.com|snapchat\.com)(?:\/[^\s]*)?/gi,
  // Emails.
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
  // @handles.
  /(?<![\w@])@[A-Za-z0-9._]{2,30}/g,
  // 10-15 digits, allowing spaces, dots, dashes and brackets between them:
  // 0803 123 4567, +234-803-123-4567, (0803) 1234567, 0123456789.
  /\(?\+?\d(?:[\s().-]{0,2}\d){9,14}/g,
];

export const hideContacts = (text: string): { text: string; hidden: boolean } => {
  let result = text;
  for (const pattern of PATTERNS) result = result.replace(pattern, CONTACT_MASK);
  return { text: result, hidden: result !== text };
};
