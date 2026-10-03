import "server-only";
import type { Recipe, Step } from "./types";

// "1" is TheMealDB's public test key. Production use needs a supporter key.
const BASE = `https://www.themealdb.com/api/json/v1/${process.env.MEALDB_API_KEY || "1"}`;

type Meal = Record<string, string | null> & { idMeal: string; strMeal: string };

const CATEGORIES = new Set([
  "beef", "breakfast", "chicken", "dessert", "goat", "lamb", "miscellaneous",
  "pasta", "pork", "seafood", "side", "starter", "vegan", "vegetarian",
]);

async function get(path: string): Promise<Meal[]> {
  const res = await fetch(`${BASE}/${path}`, {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`mealdb ${res.status}`);
  const data = (await res.json()) as { meals: Meal[] | string | null };
  return Array.isArray(data.meals) ? data.meals : [];
}

function splitSteps(raw: string): Step[] {
  const lines = raw
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*(step\s*\d+[:.)]?|\d+[.)])\s*/i, "").trim())
    .filter((l) => l && !/^step\s*\d*$/i.test(l));
  if (lines.length > 1) return lines.map((text) => ({ text }));

  // One big paragraph: group sentences in pairs so each step is a readable chunk.
  const sentences = (lines[0] ?? "").match(/[^.!?]+[.!?]+(\s|$)/g) ?? [lines[0] ?? ""];
  const steps: Step[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    steps.push({ text: sentences.slice(i, i + 2).join("").trim() });
  }
  return steps.filter((s) => s.text);
}

export function toRecipe(m: Meal): Recipe {
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = m[`strIngredient${i}`]?.trim();
    if (!name) continue;
    const measure = m[`strMeasure${i}`]?.trim();
    ingredients.push(measure && !/^as required$/i.test(measure) ? `${measure} ${name}` : name);
  }
  const tags = [m.strCategory, m.strArea, ...(m.strTags?.split(",") ?? [])]
    .map((t) => t?.trim())
    .filter((t): t is string => Boolean(t));

  return {
    id: `m-${m.idMeal}`,
    origin: "mealdb",
    title: m.strMeal,
    image: m.strMealThumb ?? undefined,
    sourceUrl: m.strSource || `https://www.themealdb.com/meal/${m.idMeal}`,
    siteName: "TheMealDB",
    description: [m.strArea, m.strCategory].filter(Boolean).join(" · ") || undefined,
    tags: [...new Set(tags)],
    ingredients,
    steps: splitSteps(m.strInstructions ?? ""),
    savedAt: 0,
  };
}

/**
 * Name search first; if nothing matches, treat the query as a category,
 * a cuisine, then a main ingredient (those endpoints return stubs, so we look
 * each one up in full).
 */
export async function searchMeals(query: string, limit = 12): Promise<Recipe[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const byName = await get(`search.php?s=${encodeURIComponent(q)}`);
  // A category word ("vegetarian") should list the category, not just titles containing it.
  if (byName.length >= limit || (byName.length && !CATEGORIES.has(q))) {
    return byName.slice(0, limit).map(toRecipe);
  }

  const cap = q.charAt(0).toUpperCase() + q.slice(1);
  const attempts = [
    ...(CATEGORIES.has(q) ? [`filter.php?c=${encodeURIComponent(cap)}`] : []),
    `filter.php?a=${encodeURIComponent(cap)}`,
    `filter.php?i=${encodeURIComponent(q.replace(/\s+/g, "_"))}`,
  ];
  for (const path of attempts) {
    const seen = new Set(byName.map((m) => m.idMeal));
    const stubs = (await get(path)).filter((s) => !seen.has(s.idMeal));
    if (!stubs.length) continue;
    const full = await Promise.all(
      stubs
        .slice(0, limit - byName.length)
        .map((s) => get(`lookup.php?i=${s.idMeal}`).then((r) => r[0]).catch(() => undefined)),
    );
    return [...byName, ...full.filter((m): m is Meal => Boolean(m))].map(toRecipe);
  }
  return byName.map(toRecipe);
}

/** Words in recipe titles and URLs that never help find the dish ("the best easy slow-cooked…"). */
const FILLER = new Set([
  "a", "the", "best", "easy", "easiest", "basic", "classic", "homemade", "perfect", "ultimate",
  "simple", "quick", "favorite", "favourite", "famous", "amazing", "delicious", "authentic",
  "recipe", "recipes", "my", "our", "worlds", "slow", "cooked", "cooker", "one", "pan", "pot",
  "instant", "weeknight", "healthy", "copycat", "style", "minute", "old", "fashioned",
]);
const CONNECTORS = new Set(["and", "with", "in", "of", "or", "on", "for"]);
/** Head nouns too broad to search on alone: "bolognese sauce" should find bolognese, not any sauce. */
const GENERIC = new Set(["sauce", "soup", "salad", "stew", "pie", "cake", "bread", "dip", "dressing", "bowl", "meat"]);

/**
 * For a loose phrase like a URL slug ("alysias-basic-meat-lasagna"): drop filler, then drop words
 * from the front until something matches — the dish is usually the last word or two. Failing
 * that, search each word by name and rank by which words a title contains.
 */
export async function searchDish(phrase: string, limit = 12): Promise<{ query: string; recipes: Recipe[] }> {
  const words = phrase.toLowerCase().split(/[\s_-]+/).filter((w) => w && !FILLER.has(w) && !CONNECTORS.has(w));
  for (let i = 0; i < words.length - 1; i++) {
    const query = words.slice(i).join(" ");
    const recipes = await searchMeals(query, limit);
    if (recipes.length) return { query, recipes };
  }

  // Later words weigh more (they're the dish, earlier ones describe it); generic ones weigh little.
  const weight = (w: string, i: number) => (GENERIC.has(w) ? 0.5 : i + 1);
  const byWord = await Promise.all(words.map((w) => get(`search.php?s=${encodeURIComponent(w)}`).catch(() => [])));
  const scored = new Map<string, { meal: Meal; score: number }>();
  for (const meal of byWord.flat()) {
    const title = meal.strMeal.toLowerCase();
    const score = words.reduce((sum, w, i) => sum + (title.includes(w) ? weight(w, i) : 0), 0);
    scored.set(meal.idMeal, { meal, score });
  }
  const best = Math.max(0, ...[...scored.values()].map((s) => s.score));
  // Only close matches: "meat lasagna" shouldn't pad lasagnas out with a meatloaf.
  const ranked = [...scored.values()].filter((s) => s.score > best / 2).sort((a, b) => b.score - a.score);
  if (!ranked.length) return { query: words.join(" ") || phrase, recipes: [] };
  // Name the search after the best-weighted word the top result actually contains.
  const top = ranked[0].meal.strMeal.toLowerCase();
  const query = words
    .map((w, i) => ({ w, s: top.includes(w) ? weight(w, i) : 0 }))
    .sort((a, b) => b.s - a.s)[0].w;
  return { query, recipes: ranked.slice(0, limit).map((s) => toRecipe(s.meal)) };
}
