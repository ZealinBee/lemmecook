import type { MetadataRoute } from "next";
import { DEFAULT_RECIPES } from "@/lib/default-recipes";
import { LANDING_PAGES } from "@/lib/landing-pages";
import { CONTENT_UPDATED, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 1 },
    ...LANDING_PAGES.map((p) => ({
      url: `${SITE_URL}/${p.slug}`,
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly" as const,
      priority: p.group === "feature" ? 0.8 : 0.7,
    })),
    { url: `${SITE_URL}/recipes`, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 0.7 },
    ...DEFAULT_RECIPES.map((r) => ({
      url: `${SITE_URL}/cook/${r.id}`,
      lastModified: r.published,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/premium`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
