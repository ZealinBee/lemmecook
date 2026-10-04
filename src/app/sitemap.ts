import type { MetadataRoute } from "next";
import { DEFAULT_RECIPES } from "@/lib/default-recipes";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...DEFAULT_RECIPES.map((r) => ({
      url: `${SITE_URL}/cook/${r.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
