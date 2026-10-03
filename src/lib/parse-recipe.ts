import "server-only";
import type { Recipe, Step } from "./types";

type Json = Record<string, unknown>;

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  frac12: "½", frac14: "¼", frac34: "¾", deg: "°", ndash: "–", mdash: "—",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…",
};

export function clean(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+\d*);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** ISO-8601 duration ("PT1H30M") → minutes. */
export function isoMinutes(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const m = value.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!m) return undefined;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  const total = d * 1440 + h * 60 + min + Math.round(s / 60);
  return total > 0 ? total : undefined;
}

function hasType(node: Json, type: string): boolean {
  const t = node["@type"];
  return Array.isArray(t) ? t.includes(type) : t === type;
}

function findRecipe(node: unknown): Json | undefined {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findRecipe(item);
      if (hit) return hit;
    }
    return undefined;
  }
  const obj = node as Json;
  if (hasType(obj, "Recipe")) return obj;
  return findRecipe(obj["@graph"]) ?? findRecipe(obj["mainEntity"]);
}

function flattenSteps(raw: unknown, section?: string): Step[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    // Some sites stuff every step into one string separated by newlines.
    return raw
      .split(/\n+|(?<=\.)\s{2,}/)
      .map(clean)
      .filter(Boolean)
      .map((text) => ({ text, section }));
  }
  if (Array.isArray(raw)) return raw.flatMap((r) => flattenSteps(r, section));
  const obj = raw as Json;
  if (hasType(obj, "HowToSection")) {
    return flattenSteps(obj.itemListElement, clean(obj.name) || section);
  }
  const text = clean(obj.text ?? obj.name ?? obj.description);
  return text ? [{ text, section }] : [];
}

function pickImage(img: unknown): string | undefined {
  if (!img) return undefined;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return pickImage(img[0]);
  const obj = img as Json;
  return typeof obj.url === "string" ? obj.url : undefined;
}

function pickAuthor(a: unknown): string | undefined {
  if (!a) return undefined;
  if (typeof a === "string") return clean(a);
  if (Array.isArray(a)) return pickAuthor(a[0]);
  return clean((a as Json).name) || undefined;
}

function pickYield(y: unknown): string | undefined {
  if (Array.isArray(y)) {
    // Often ["4", "4 servings"] — prefer the descriptive one.
    const strs = y.map(String);
    return clean(strs.find((s) => /\D/.test(s)) ?? strs[0]);
  }
  if (y == null) return undefined;
  return clean(String(y)) || undefined;
}

function metaContent(html: string, prop: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
  return html.match(re)?.[1];
}

export function extractRecipe(html: string, sourceUrl: string): Omit<Recipe, "id" | "savedAt"> | null {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  let recipe: Json | undefined;
  for (const [, body] of blocks) {
    try {
      recipe = findRecipe(JSON.parse(body.trim()));
    } catch {
      continue;
    }
    if (recipe) break;
  }
  if (!recipe) return null;

  const ingredients = (
    (recipe.recipeIngredient ?? recipe.ingredients ?? []) as unknown[]
  )
    .map(clean)
    .filter(Boolean);
  const steps = flattenSteps(recipe.recipeInstructions);
  if (!ingredients.length && !steps.length) return null;

  const prep = isoMinutes(recipe.prepTime);
  const cook = isoMinutes(recipe.cookTime);

  return {
    origin: "link",
    sourceUrl,
    siteName: clean(metaContent(html, "og:site_name")) || new URL(sourceUrl).hostname.replace(/^www\./, ""),
    title: clean(recipe.name) || "Untitled recipe",
    description: clean(recipe.description) || undefined,
    image: pickImage(recipe.image) ?? metaContent(html, "og:image"),
    author: pickAuthor(recipe.author),
    yield: pickYield(recipe.recipeYield),
    prepMinutes: prep,
    cookMinutes: cook,
    totalMinutes: isoMinutes(recipe.totalTime) ?? (prep || cook ? (prep ?? 0) + (cook ?? 0) : undefined),
    ingredients,
    steps,
  };
}
