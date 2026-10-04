/** Public origin, for canonical URLs, the sitemap and social cards. Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Lemme Cook";
export const SITE_TITLE = "Lemme Cook: Hands-Free, Voice-Guided Cooking";
export const SITE_DESCRIPTION =
  "Cook hands-free with voice control. Paste any recipe link or text and Lemme Cook guides you step by step: say “next”, set timers, hear steps read aloud, and keep your screen on. No app, no account.";
