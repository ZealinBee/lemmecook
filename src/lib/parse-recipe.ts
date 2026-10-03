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

/** Some sites ship JSON-LD with raw newlines or tabs inside strings, which JSON.parse rejects. */
function parseJsonLoose(body: string): unknown {
  const text = body.trim().replace(/^<!--|-->$/g, "");
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/[\u0000-\u001f]+/g, " "));
  }
}

function fromSchema(recipe: Json, sourceUrl: string, siteName?: string, image?: string): Omit<Recipe, "id" | "savedAt"> | null {
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
    siteName: clean(siteName) || new URL(sourceUrl).hostname.replace(/^www\./, ""),
    title: clean(recipe.name) || "Untitled recipe",
    description: clean(recipe.description) || undefined,
    image: pickImage(recipe.image) ?? image,
    author: pickAuthor(recipe.author),
    yield: pickYield(recipe.recipeYield),
    prepMinutes: prep,
    cookMinutes: cook,
    totalMinutes: isoMinutes(recipe.totalTime) ?? (prep || cook ? (prep ?? 0) + (cook ?? 0) : undefined),
    ingredients,
    steps,
  };
}

/** Older sites mark recipes up with schema.org microdata (itemprop="…") instead of JSON-LD. */
function extractMicrodata(html: string): Json | undefined {
  if (!/itemtype=["']https?:\/\/schema\.org\/Recipe["']/i.test(html)) return undefined;
  /** Raw values in document order: a tag's content="…" attribute, or else its inner HTML. */
  const props = (name: string) => {
    const out: string[] = [];
    const tag = new RegExp(`<(\\w+)\\b[^>]*\\bitemprop=["'](?:[^"']*\\s)?${name}(?:\\s[^"']*)?["'][^>]*>`, "gi");
    for (const m of html.matchAll(tag)) {
      const content = m[0].match(/\bcontent=["']([^"']*)["']/i)?.[1];
      if (content != null) {
        out.push(content);
        continue;
      }
      if (/^(meta|link|img|br)$/i.test(m[1])) continue;
      // Inner HTML up to the matching close tag, counting nested tags of the same name.
      const open = new RegExp(`<${m[1]}\\b|</${m[1]}>`, "gi");
      open.lastIndex = m.index + m[0].length;
      let depth = 1;
      let end = html.length;
      for (let t = open.exec(html); t; t = open.exec(html)) {
        depth += t[0][1] === "/" ? -1 : 1;
        if (depth === 0) {
          end = t.index;
          break;
        }
      }
      out.push(html.slice(m.index + m[0].length, end));
    }
    return out;
  };
  const one = (name: string) => clean(props(name)[0]) || undefined;

  const ingredients = props("(?:recipeIngredient|ingredients)").map(clean).filter(Boolean);
  // Either one element per step, or one block holding every step as <li>/<p>/<br>-separated lines.
  const steps = props("recipeInstructions")
    .flatMap((raw) => raw.split(/<\/(?:li|p|div)>|<br\s*\/?>/i))
    .map(clean)
    .filter(Boolean);
  if (!ingredients.length && !steps.length) return undefined;
  return {
    name: one("name"),
    description: one("description"),
    image: one("image"),
    recipeYield: one("recipeYield"),
    prepTime: one("prepTime"),
    cookTime: one("cookTime"),
    totalTime: one("totalTime"),
    recipeIngredient: ingredients,
    recipeInstructions: steps,
  };
}

/** Works on a full page from the server, or on the fragments the bookmarklet sends from the live page. */
export function extractRecipe(html: string, sourceUrl: string): Omit<Recipe, "id" | "savedAt"> | null {
  const siteName = metaContent(html, "og:site_name");
  const image = metaContent(html, "og:image");
  for (const [, body] of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    let recipe: Json | undefined;
    try {
      recipe = findRecipe(parseJsonLoose(body));
    } catch {
      continue;
    }
    const parsed = recipe && fromSchema(recipe, sourceUrl, siteName, image);
    if (parsed) return parsed;
  }
  const micro = extractMicrodata(html);
  return micro ? fromSchema(micro, sourceUrl, siteName, image) : null;
}
