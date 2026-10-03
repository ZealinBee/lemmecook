import type { Recipe, Step } from "./types";
import { parseDuration } from "./voice-commands";

type Parsed = Omit<Recipe, "id" | "savedAt">;

const INGREDIENTS_HEADER = /^(ingredients?|ingredient list|what you(?:'|’)?ll need|you(?:'|’)?ll need|you will need|shopping list)\b/i;
const STEPS_HEADER = /^(instructions?|directions?|method|steps|preparation|how to make(?: it)?|to make)\b/i;
const NOTES_HEADER = /^(notes?|tips?|nutrition(?: facts| information)?|storage|equipment|serving suggestions?)\b/i;

/** "## Ingredients:", "**INGREDIENTS (serves 4)**" → "Ingredients (serves 4)". */
function stripMarkup(line: string): string {
  return line
    .replace(/^#+\s*/, "")
    .replace(/^[*_]+|[*_]+$/g, "")
    .replace(/:\s*$/, "")
    .trim();
}

function headerKind(line: string): "ingredients" | "steps" | "notes" | undefined {
  const s = stripMarkup(line);
  // Real headers are short; "Method: whisk everything together…" is a step, not a header.
  if (s.length > 40) return undefined;
  if (INGREDIENTS_HEADER.test(s)) return "ingredients";
  if (STEPS_HEADER.test(s)) return "steps";
  if (NOTES_HEADER.test(s)) return "notes";
  return undefined;
}

/** Bullets, checkboxes and "1." / "Step 2:" prefixes. */
function stripBullet(line: string): string {
  return line
    .replace(/^\s*(?:[-*•·▢□☐◦‣–—]+\s*|\[\s?[x ]?\]\s*)/i, "")
    .replace(/^\s*(?:step\s*)?\d{1,2}\s*[.):]\s+/i, "")
    .trim();
}

/** "For the sauce:" — a short label introducing a group of ingredients or steps. */
function subheading(line: string): string | undefined {
  const s = line.replace(/^#+\s*/, "").replace(/^[*_]+|[*_]+$/g, "").trim();
  if (s.length <= 50 && /:$/.test(s) && !/\d/.test(s)) return s.replace(/:$/, "");
  return undefined;
}

const QUANTITY = /^(?:\d|[½¼¾⅓⅔⅛]|(?:a|an|one|two|three|four|half|pinch|dash|handful|few|some|salt|pepper)\b)/i;

function looksLikeIngredient(line: string): boolean {
  return line.length <= 80 && !/[.!?]$/.test(line) && (QUANTITY.test(line) || line.split(" ").length <= 5);
}

function minutesAfter(text: string, label: RegExp): number | undefined {
  const m = text.match(new RegExp(`${label.source}\\s*(?:time)?\\s*[:\\-–]?\\s*([^\\n|,;]+)`, "i"));
  const seconds = m ? parseDuration(m[1]) : undefined;
  return seconds ? Math.round(seconds / 60) : undefined;
}

export function parseRecipeText(input: string): Parsed | null {
  const lines = input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim());

  let title = "";
  const intro: string[] = [];
  const ingredients: string[] = [];
  const steps: Step[] = [];
  let mode: "intro" | "ingredients" | "steps" | "notes" = "intro";
  let section: string | undefined;
  let sawHeader = false;

  for (const raw of lines) {
    if (!raw) continue;
    const kind = headerKind(raw);
    if (kind) {
      mode = kind;
      section = undefined;
      sawHeader = true;
      continue;
    }
    if (mode === "intro") {
      if (!title && raw.length <= 120) title = stripMarkup(raw);
      else intro.push(raw);
      continue;
    }
    if (mode === "notes") continue;

    const sub = subheading(raw);
    if (sub) {
      section = sub;
      continue;
    }
    const line = stripBullet(raw);
    if (!line || /^step\s*\d+$/i.test(line)) continue;
    if (mode === "ingredients") ingredients.push(line);
    else steps.push({ text: line, section });
  }

  // No recognisable headers: sort the body by shape — short quantity-led lines
  // are ingredients, sentences are steps.
  if (!sawHeader) {
    for (const raw of intro.splice(0)) {
      const line = stripBullet(raw);
      if (!line) continue;
      if (!steps.length && looksLikeIngredient(line)) ingredients.push(line);
      else steps.push({ text: line });
    }
  }

  // "Instructions" header but no "Ingredients" one: the list sits in the intro.
  if (sawHeader && !ingredients.length) {
    const rest = intro.splice(0).filter((raw) => {
      const line = stripBullet(raw);
      if (!QUANTITY.test(line) || !looksLikeIngredient(line)) return true;
      ingredients.push(line);
      return false;
    });
    intro.push(...rest);
  }

  if (!steps.length && !ingredients.length) return null;

  const meta = intro.join("\n");
  const prep = minutesAfter(meta, /prep(?:aration)?/);
  const cook = minutesAfter(meta, /cook(?:ing)?/);
  const total = minutesAfter(meta, /total/);
  const servings = meta.match(/\b(?:serves|servings|yield|makes)\s*:?\s*([^\n|,;]+)/i);
  const description = intro.find((l) => l.length > 40 && !/\b(prep|cook|total)\b.*\d|\bserves\b/i.test(l));

  return {
    title: title || "Untitled recipe",
    siteName: "Pasted recipe",
    description,
    yield: servings ? `${/^serves/i.test(servings[0]) ? "Serves " : ""}${servings[1].trim()}` : undefined,
    prepMinutes: prep,
    cookMinutes: cook,
    totalMinutes: total ?? (prep || cook ? (prep ?? 0) + (cook ?? 0) : undefined),
    ingredients,
    steps,
  };
}
