import "server-only";
import { clean, isoMinutes } from "../parse-recipe";
import type { Recipe } from "../types";

/** "1 час 15 мин" → "PT1H15M". */
function isoFromRussian(text: string): string | undefined {
  const h = text.match(/(\d+)\s*ч/)?.[1];
  const m = text.match(/(\d+)\s*мин/)?.[1];
  return h || m ? `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}` : undefined;
}

/** russianfood.com publishes no schema.org data at all, so read its table-based markup directly. */
export function extractRussianFood(html: string, sourceUrl: string): Omit<Recipe, "id" | "savedAt"> | null {
  if (!/(^|\.)russianfood\.com$/i.test(new URL(sourceUrl).hostname)) return null;

  const ingredients = [...html.matchAll(/<tr class="ingr_tr_\d+">\s*<td[^>]*>([\s\S]*?)<\/td>/gi)]
    .map(([, cell]) => clean(cell))
    .filter(Boolean);
  // Newer recipes have photo steps; older ones keep numbered paragraphs in #how.
  let steps = [...html.matchAll(/<div class="step_n">[\s\S]*?<p>([\s\S]*?)<\/p>/gi)].map(([, p]) => clean(p));
  if (!steps.some(Boolean)) {
    const how = html.match(/<div id="how"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
    steps = [...how.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(([, p]) => clean(p).replace(/^\d{1,2}\s*[.)]\s*/, ""));
  }
  steps = steps.filter(Boolean);
  if (!ingredients.length && !steps.length) return null;

  const image = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)/i)?.[1];
  const time = clean(html.match(/ico_time[\s\S]*?<span class="hl">([\s\S]*?)<\/span>/i)?.[1]);

  return {
    origin: "link",
    sourceUrl,
    siteName: "RussianFood.com",
    title: clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || "Untitled recipe",
    description: clean(html.match(/data-description=["']([^"']*)/i)?.[1]) || undefined,
    image: image?.startsWith("//") ? `https:${image}` : image,
    yield: clean(html.match(/<span class="portion">\(?([^<)]*)/i)?.[1]) || undefined,
    totalMinutes: isoMinutes(isoFromRussian(time)),
    ingredients,
    steps: steps.map((text) => ({ text })),
  };
}
