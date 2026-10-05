/** Multiply the quantity in an ingredient line, e.g. "1½ tsp salt" × 2 → "3 tsp salt". */

export const SCALES = [0.5, 1, 1.5, 2];

const GLYPHS: Record<string, number> = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};
const G = Object.keys(GLYPHS).join("");

// "1 1/2", "1½", "1/2", "½", "1.5", "1,5", "2"
export const NUM = `(?:\\d+\\s+\\d+/\\d+|\\d+\\s*[${G}]|\\d+/\\d+|\\d+(?:[.,]\\d+)?|[${G}])`;
// A number, optionally a range: "1-2", "2 – 3", "3 to 4"
const QTY = new RegExp(`(?<![\\w/])(${NUM})(?:(\\s*(?:-|–|—|to)\\s*)(${NUM}))?(?![\\d/])`, "g");

// Nice kitchen fractions, as [value, glyph].
const FRACTIONS: [number, string][] = [
  [0, ""],
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [1, ""],
];

export function parse(s: string): number {
  s = s.trim();
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return +m[1] + +m[2] / +m[3];
  m = s.match(new RegExp(`^(\\d+)\\s*([${G}])$`));
  if (m) return +m[1] + GLYPHS[m[2]];
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return +m[1] / +m[2];
  if (GLYPHS[s]) return GLYPHS[s];
  return parseFloat(s.replace(",", "."));
}

export function format(n: number, decimal: "." | "," | null): string {
  if (n >= 10) return String(Math.round(n));
  // The recipe wrote "1.5" or "2,5 dl" — answer in kind.
  if (decimal) {
    const places = n < 1 ? 100 : 10;
    return String(Math.round(n * places) / places).replace(".", decimal);
  }

  let whole = Math.floor(n);
  const frac = n - whole;
  const [value, nearest] = FRACTIONS.reduce((a, b) => (Math.abs(b[0] - frac) < Math.abs(a[0] - frac) ? b : a));
  let glyph = nearest;
  if (value === 1) whole += 1;
  if (whole === 0 && !glyph) glyph = "⅛";
  return whole ? `${whole}${glyph}` : glyph;
}

function scaleNumber(s: string, factor: number): string {
  const decimal = /\d[.,]\d/.test(s) ? (s.includes(",") ? "," : ".") : null;
  return format(parse(s) * factor, decimal);
}

/** Scales the first quantity outside parentheses, so "1 can (400 g)" → "2 cans (400 g)"-style lines keep the can size. */
export function scaleIngredient(line: string, factor: number): string {
  if (factor === 1) return line;
  for (const m of line.matchAll(QTY)) {
    const before = line.slice(0, m.index);
    const depth = (before.match(/\(/g)?.length ?? 0) - (before.match(/\)/g)?.length ?? 0);
    if (depth > 0) continue;
    const [all, a, sep, b] = m;
    const scaled = scaleNumber(a, factor) + (b ? sep + scaleNumber(b, factor) : "");
    return before + scaled + line.slice(m.index + all.length);
  }
  return line;
}

export function formatScale(f: number): string {
  return `${format(f, null)}×`;
}
