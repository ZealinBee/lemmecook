/** Convert quantities and oven temperatures in recipe text, e.g. "1 cup milk" → "240 ml milk", "350°F" → "180°C". */

import { format, NUM, parse } from "./scale";

export type UnitSystem = "original" | "metric" | "us";

export const UNIT_SYSTEMS: { id: UnitSystem; label: string }[] = [
  { id: "original", label: "Original" },
  { id: "metric", label: "Metric" },
  { id: "us", label: "US" },
];

type Unit = {
  re: RegExp;
  system: "metric" | "us";
  kind: "volume" | "weight";
  /** Millilitres or grams in one of this unit. */
  base: number;
  /** Spoons read the same in both systems, so metric leaves them alone. */
  spoon?: boolean;
};

const unit = (re: string, system: Unit["system"], kind: Unit["kind"], base: number, spoon?: boolean): Unit & { src: string } => ({
  src: re,
  re: new RegExp(`^(?:${re})$`, "i"),
  system,
  kind,
  base,
  spoon,
});

// Longest spellings first so "fl oz" wins over "oz".
const UNITS = [
  unit("fl\\.?\\s*oz\\.?|fluid\\s+ounces?", "us", "volume", 30),
  unit("cups?", "us", "volume", 240),
  unit("tablespoons?|tbsps?\\.?|tbs\\.?", "us", "volume", 15, true),
  unit("teaspoons?|tsps?\\.?", "us", "volume", 5, true),
  unit("pints?|pt\\.?", "us", "volume", 473),
  unit("quarts?|qts?\\.?", "us", "volume", 946),
  unit("gallons?|gal\\.?", "us", "volume", 3785),
  unit("ounces?|oz\\.?", "us", "weight", 28.35),
  unit("pounds?|lbs?\\.?", "us", "weight", 453.6),
  unit("millilit(?:er|re)s?|ml", "metric", "volume", 1),
  unit("centilit(?:er|re)s?|cl", "metric", "volume", 10),
  unit("decilit(?:er|re)s?|dl", "metric", "volume", 100),
  unit("lit(?:er|re)s?|l", "metric", "volume", 1000),
  unit("kilograms?|kilos?|kg", "metric", "weight", 1000),
  unit("grams?|gr?", "metric", "weight", 1),
];

// "1½ cups", "2-3 tbsp", "14-ounce", "400g"
const QTY_UNIT = new RegExp(
  `(?<![\\w/])(${NUM})(?:(\\s*(?:-|–|—|to)\\s*)(${NUM}))?\\s*-?\\s*(${UNITS.map((u) => u.src).join("|")})(?![a-zA-Z])`,
  "gi",
);

// "350°F", "180 °C", "200 degrees Celsius", "350-375°F"
const TEMP = /(?<![\w.])(\d{2,3})(?:(\s*(?:-|–|—|to)\s*)(\d{2,3}))?\s*(?:°|º|degrees?)\s*(fahrenheit|celsius|F|C)(?![a-zA-Z])/gi;

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

function metricAmount(n: number): string {
  if (n >= 1000) return String(Math.round(n / 10) / 100);
  if (n < 10) return String(Math.max(1, Math.round(n)));
  return String(roundTo(n, n < 100 ? 5 : 10));
}

function convertAmounts(amounts: number[], u: Unit, to: "metric" | "us"): { values: string[]; label: string } | null {
  if (u.system === to || (to === "metric" && u.spoon)) return null;
  const base = amounts.map((a) => a * u.base);
  const max = Math.max(...base);

  if (to === "metric") {
    const big = max >= 1000;
    return {
      values: base.map(metricAmount),
      label: u.kind === "volume" ? (big ? "l" : "ml") : big ? "kg" : "g",
    };
  }

  const [size, label] =
    u.kind === "volume"
      ? max < 15
        ? [4.93, "tsp"]
        : max < 60
          ? [14.79, "tbsp"]
          : [236.6, "cup"]
      : max < 453.6
        ? [28.35, "oz"]
        : [453.6, "lb"];
  const values = base.map((b) => format(b / size, null));
  return { values, label: label === "cup" && parse(values.at(-1)!) > 1 ? "cups" : label };
}

function convertTemp(n: number, unit: string, to: "metric" | "us"): number | null {
  const fahrenheit = /^f/i.test(unit);
  if (fahrenheit === (to === "us")) return null;
  if (fahrenheit) return roundTo(((n - 32) * 5) / 9, n >= 250 ? 10 : 5);
  const f = (n * 9) / 5 + 32;
  return roundTo(f, f >= 250 ? 25 : 5);
}

export function convertUnits(text: string, system: UnitSystem): string {
  if (system === "original") return text;
  return text
    .replace(QTY_UNIT, (all, a: string, sep: string | undefined, b: string | undefined, unitText: string) => {
      const u = UNITS.find((x) => x.re.test(unitText.trim()));
      const amounts = [parse(a), ...(b ? [parse(b)] : [])];
      if (!u || amounts.some((n) => !(n > 0))) return all;
      const out = convertAmounts(amounts, u, system);
      if (!out) return all;
      return `${out.values.join(sep ?? "")} ${out.label}`;
    })
    .replace(TEMP, (all, a: string, sep: string | undefined, b: string | undefined, unitText: string) => {
      const temps = [a, ...(b ? [b] : [])].map((t) => convertTemp(+t, unitText, system));
      if (temps.some((t) => t === null)) return all;
      return `${temps.join(sep ?? "")}°${system === "us" ? "F" : "C"}`;
    });
}
