import type { Metadata } from "next";

const configuredUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

if (!configuredUrl && process.env.NODE_ENV === "production") {
  console.warn("NEXT_PUBLIC_SITE_URL is not set: canonical URLs, the sitemap and social cards will point at localhost.");
}

/** Public origin, for canonical URLs, the sitemap and social cards. Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL = (configuredUrl ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "Lemme Cook";
export const SITE_TITLE = "Lemme Cook: Hands-Free, Voice-Guided Cooking";
export const SITE_DESCRIPTION =
  "Cook hands-free with voice control. Paste any recipe link (TikTok and Instagram too) or text and Lemme Cook guides you step by step: say “next”, set timers, hear steps read aloud, and keep your screen on. No app, no account.";

/**
 * Open Graph fields every page shares. A page's `openGraph` replaces its parent's
 * outright, so pages spread this and add their own title, description and url.
 */
export const SITE_OPEN_GRAPH = {
  type: "website",
  siteName: SITE_NAME,
  locale: "en_US",
  // The card from app/opengraph-image.tsx; a page's own openGraph drops it unless listed here.
  images: ["/opengraph-image"],
} satisfies Metadata["openGraph"];
