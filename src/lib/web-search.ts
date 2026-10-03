import "server-only";
import { clean } from "./parse-recipe";
import type { Recipe, Step } from "./types";

/**
 * Recipe blogs whose WordPress search API is open. Search engines block server-side queries
 * without a paid key, and many of these sites block page fetches too, but the API answers with
 * the full recipe: WP Recipe Maker exposes it as JSON, Tasty Recipes embeds its card in the post.
 */
const SITES: { host: string; name: string; plugin: "wprm" | "tasty" }[] = [
  { host: "www.recipetineats.com", name: "RecipeTin Eats", plugin: "wprm" },
  { host: "www.budgetbytes.com", name: "Budget Bytes", plugin: "wprm" },
  { host: "natashaskitchen.com", name: "Natasha's Kitchen", plugin: "wprm" },
  { host: "www.onceuponachef.com", name: "Once Upon a Chef", plugin: "wprm" },
  { host: "www.isabeleats.com", name: "Isabel Eats", plugin: "wprm" },
  { host: "www.gimmesomeoven.com", name: "Gimme Some Oven", plugin: "wprm" },
  { host: "minimalistbaker.com", name: "Minimalist Baker", plugin: "wprm" },
  { host: "www.skinnytaste.com", name: "Skinnytaste", plugin: "wprm" },
  { host: "www.halfbakedharvest.com", name: "Half Baked Harvest", plugin: "wprm" },
  { host: "www.spendwithpennies.com", name: "Spend With Pennies", plugin: "wprm" },
  { host: "cafedelites.com", name: "Cafe Delites", plugin: "wprm" },
  { host: "thewoksoflife.com", name: "The Woks of Life", plugin: "wprm" },
  { host: "hebbarskitchen.com", name: "Hebbars Kitchen", plugin: "wprm" },
  { host: "www.themediterraneandish.com", name: "The Mediterranean Dish", plugin: "wprm" },
  { host: "www.mexicoinmykitchen.com", name: "Mexico in My Kitchen", plugin: "wprm" },
  { host: "cookieandkate.com", name: "Cookie and Kate", plugin: "tasty" },
  { host: "pinchofyum.com", name: "Pinch of Yum", plugin: "tasty" },
];

type Site = (typeof SITES)[number];
// No description: blog summaries ("Recipe video above…") make poor card subtitles; the site name shows instead.
type Found = Omit<Recipe, "id" | "savedAt">;

/** "burritos" → "burrito", so plurals in the query or the title still match. */
const stem = (w: string) => w.replace(/(es|s)$/, "");
const wordsOf = (s: string) => (s.toLowerCase().match(/\p{L}+/gu) ?? []).map(stem).filter((w) => w.length > 1);

/** clean() spaces out tags, which leaves "Black Beans *" and "tortillas , flour". */
const tidy = (s: unknown) => clean(s).replace(/\s+([,.;:*)!?])/g, "$1").replace(/\(\s+/g, "(");

/** WordPress search matches anywhere in the post; keep the ones whose title is about the dish. */
function aboutDish(title: string, terms: string[]): boolean {
  const t = new Set(wordsOf(title));
  return terms.every((w) => t.has(w)) && !/^\d+\+?\s/.test(title); // skip roundups ("36 Mexican Recipes…")
}

function fullImage(url: unknown): string | undefined {
  if (typeof url !== "string" || !url) return undefined;
  // Thumbnails: "…/x.jpg?fit=150%2C210" or "…/x-150x150.jpg".
  return url.replace(/\?.*$/, "").replace(/-\d+x\d+(?=\.\w+$)/, "");
}

const minutes = (v: unknown) => (Number(v) > 0 ? Number(v) : undefined);

type WprmItem = { type?: string; name?: string; amount?: string; unit?: string; notes?: string; text?: string };
type WprmRecipe = {
  name: string;
  summary?: string;
  image_url?: string;
  author_name?: string;
  servings?: string | number;
  servings_unit?: string;
  prep_time?: unknown;
  cook_time?: unknown;
  total_time?: unknown;
  ingredients_flat?: WprmItem[];
  instructions_flat?: WprmItem[];
};

function fromWprm(r: WprmRecipe, link: string, site: Site): Found | null {
  // Recipe cards not attached to a post ("/?post_type=wprm_recipe&p=…") are drafts or duplicates.
  if (/[?&]post_type=wprm_recipe/.test(link)) return null;
  const ingredients = (r.ingredients_flat ?? [])
    .filter((i) => i.type !== "group")
    .map((i) => {
      // Budget Bytes puts the price in notes ("$1.69").
      const notes = /^\$[\d.]+$/.test(tidy(i.notes)) ? "" : tidy(i.notes);
      const line = [i.amount, i.unit, i.name].map(tidy).filter(Boolean).join(" ");
      return notes ? `${line}${/^[,(]/.test(notes) ? "" : ","} ${notes}`.replace(/ ,/, ",") : line;
    })
    .filter(Boolean);
  const steps: Step[] = [];
  let section: string | undefined;
  for (const i of r.instructions_flat ?? []) {
    if (i.type === "group") {
      const name = tidy(i.name).replace(/:$/, "");
      section = /^full (recipe|version)$/i.test(name) ? undefined : name || undefined;
    }
    // RecipeTin Eats opens with a condensed copy of the method, then "Full recipe".
    else if (section && /abbreviated|short version|quick version/i.test(section)) continue;
    // Some sites pack every step into one instruction as numbered paragraphs.
    else
      for (const para of (i.text ?? "").split(/<\/p>\s*<p[^>]*>|<br\s*\/?>/i)) {
        const text = tidy(para).replace(/^\d+[.)]\s+/, "");
        if (text) steps.push({ text, ...(section && { section }) });
      }
  }
  if (!ingredients.length || !steps.length) return null;
  const servings = r.servings ? `${r.servings} ${tidy(r.servings_unit)}`.trim() : undefined;
  return {
    origin: "link",
    title: tidy(r.name),
    image: fullImage(r.image_url),
    author: tidy(r.author_name) || undefined,
    sourceUrl: link,
    siteName: site.name,
    yield: servings,
    prepMinutes: minutes(r.prep_time),
    cookMinutes: minutes(r.cook_time),
    totalMinutes: minutes(r.total_time),
    ingredients,
    steps,
  };
}

/** List items inside the first element with this class: Tasty's ingredient and instruction lists. */
function listIn(html: string, className: string): string[] {
  const start = html.indexOf(`class="${className}"`);
  if (start < 0) return [];
  const body = html.slice(start, html.indexOf("</div>", start));
  return [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => tidy(m[1])).filter(Boolean);
}

type Post = {
  link: string;
  title: { rendered: string };
  content?: { rendered: string };
  yoast_head_json?: { og_image?: { url: string }[] };
};

function fromTasty(p: Post, site: Site): Found | null {
  const html = p.content?.rendered ?? "";
  const ingredients = listIn(html, "tasty-recipes-ingredients-body");
  const steps = listIn(html, "tasty-recipes-instructions-body").map((text) => ({ text }));
  if (!ingredients.length || !steps.length) return null;
  return {
    origin: "link",
    title: tidy(p.title.rendered),
    image: p.yoast_head_json?.og_image?.[0]?.url,
    sourceUrl: p.link,
    siteName: site.name,
    ingredients,
    steps,
  };
}

async function searchSite(site: Site, query: string, terms: string[]): Promise<Found[]> {
  const path =
    site.plugin === "wprm"
      ? `wprm_recipe?search=${encodeURIComponent(query)}&per_page=5&orderby=relevance&_fields=link,recipe`
      : `posts?search=${encodeURIComponent(query)}&per_page=5&orderby=relevance&_fields=link,title,content,yoast_head_json`;
  const res = await fetch(`https://${site.host}/wp-json/wp/v2/${path}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LemmeCook/1.0)" },
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];
  const items = (await res.json()) as (Post & { recipe?: WprmRecipe })[];
  if (!Array.isArray(items)) return [];
  return items
    .map((p) => (site.plugin === "wprm" ? p.recipe && fromWprm(p.recipe, p.link, site) : fromTasty(p, site)))
    .filter((r): r is Found => Boolean(r) && aboutDish(r!.title, terms))
    .slice(0, 2);
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Search recipe blogs across the web for a dish. */
export async function searchWeb(query: string, limit = 12): Promise<Recipe[]> {
  const terms = wordsOf(query);
  if (!terms.length) return [];
  const perSite = await Promise.all(SITES.map((s) => searchSite(s, query, terms).catch(() => [])));
  // Interleave so one site doesn't fill the page: first hit from each, then second hits.
  const seen = new Set<string>();
  return [...perSite.map((l) => l[0]), ...perSite.map((l) => l[1])]
    .filter((r): r is Found => Boolean(r))
    // A post can hold more than one recipe card; one per post is plenty.
    .filter((r) => !seen.has(r.sourceUrl!) && Boolean(seen.add(r.sourceUrl!)))
    .slice(0, limit)
    .map((r) => ({ ...r, id: `w-${hash(r.sourceUrl ?? r.title)}`, savedAt: 0 }));
}
