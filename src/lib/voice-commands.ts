export type Command =
  | { type: "next" }
  | { type: "previous" }
  | { type: "goto"; step: number }
  | { type: "ingredients" }
  | { type: "steps" }
  | { type: "close" }
  | { type: "timer"; seconds: number; label?: string }
  | { type: "cancel-timer" }
  | { type: "time-left" }
  | { type: "repeat" }
  | { type: "quiet" }
  | { type: "help" };

const WORD_NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  "twenty five": 25, thirty: 30, forty: 40, "forty five": 45, fifty: 50, sixty: 60,
  ninety: 90, half: 0.5,
  // common recognizer mishearings
  to: 2, too: 2, for: 4, won: 1,
};

const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, last: -1,
};

function toNumber(token: string): number | undefined {
  const n = Number(token);
  if (!Number.isNaN(n)) return n;
  return WORD_NUMBERS[token];
}

const UNIT = /(hours?|hrs?|minutes?|mins?|seconds?|secs?)/;
function unitSeconds(unit: string): number {
  if (unit.startsWith("h")) return 3600;
  if (unit.startsWith("m")) return 60;
  return 1;
}

/** "5 minutes", "an hour and a half", "1 hour 20 minutes", "ninety seconds" → seconds */
export function parseDuration(text: string): number | undefined {
  const t = text.toLowerCase().replace(/-/g, " ");
  if (/\b(an?|one) hour and a half\b/.test(t)) return 5400;
  if (/\bhalf (an )?hour\b/.test(t)) return 1800;
  if (/\b(a )?quarter (of an )?hour\b/.test(t)) return 900;

  const numberish = `(\\d+(?:\\.\\d+)?|${Object.keys(WORD_NUMBERS)
    .sort((a, b) => b.length - a.length)
    .join("|")})`;
  const re = new RegExp(`\\b${numberish}\\s*${UNIT.source}\\b(\\s+and\\s+a\\s+half)?`, "g");
  let total = 0;
  for (const m of t.matchAll(re)) {
    const n = toNumber(m[1]);
    if (n == null) continue;
    const unit = unitSeconds(m[2]);
    total += n * unit + (m[3] ? unit / 2 : 0);
  }
  return total > 0 ? Math.round(total) : undefined;
}

export function parseCommand(transcript: string): Command | null {
  const t = transcript.toLowerCase().trim();
  if (!t) return null;

  if (/\b(cancel|stop|clear|kill)\b.*\btimer\b/.test(t)) return { type: "cancel-timer" };
  if (/\b(how (much|long)|time left|remaining)\b/.test(t) && /\b(timer|left|remaining)\b/.test(t))
    return { type: "time-left" };
  if (/\b(timer|set|start|remind)\b/.test(t)) {
    const seconds = parseDuration(t);
    if (seconds) {
      // "…for ten minutes for the pasta" → label is the last "for …" clause without a duration.
      const tail = t.split(/\bfor\b/).at(-1)?.replace(/^\s*(the|my)\s+/, "").trim();
      const label = tail && !UNIT.test(tail) && !/\d/.test(tail) ? tail : undefined;
      return { type: "timer", seconds, label };
    }
  }

  const gotoMatch =
    t.match(/\b(?:go to|jump to|skip to)?\s*step\s+(\w+)/) ??
    t.match(/\b(?:go to|jump to|what'?s|what is)\s+(?:the\s+)?(\w+)\s+step/);
  if (gotoMatch) {
    const raw = gotoMatch[1];
    const n = ORDINALS[raw] ?? toNumber(raw);
    if (n) return { type: "goto", step: n };
  }

  // "close ingredients", "hide the list", "never mind" → dismiss whatever sheet is open.
  if (/\b(close|hide|dismiss|never ?mind|go away)\b/.test(t)) return { type: "close" };
  if (/\bread\b/.test(t) && /\bingredients?\b/.test(t)) return { type: "ingredients" };
  // "read aloud", "read it out", "read the instructions", "say it", "speak"… → read the current step.
  if (
    /\b(repeat|again|what was that|pardon|come again|read|reed|speak|say (it|that|this)|tell me|out loud|aloud)\b/.test(t)
  )
    return { type: "repeat" };
  if (/^(stop|quiet|hush|shush|silence|be quiet|stop talking|shut up)\b/.test(t)) return { type: "quiet" };

  if (/\b(ingredients?|what do i need|shopping)\b/.test(t)) return { type: "ingredients" };
  if (/\b(next|continue|done|forward|okay next|got it)\b/.test(t)) return { type: "next" };
  if (/\b(back|previous|go back|last one|before)\b/.test(t)) return { type: "previous" };
  if (/\b(steps?|instructions|start cooking|let'?s cook|begin)\b/.test(t)) return { type: "steps" };
  if (/\b(help|what can i say|commands)\b/.test(t)) return { type: "help" };
  return null;
}

const FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
// 1 · 1.5 · 1,5 · ½ · 1½ · 1 ½ · 1 1/2 · 1/2
const NUM = String.raw`(?:\d+(?:[.,]\d+)?(?:\s*(?:[½¼¾⅓⅔]|\d\/\d))?|[½¼¾⅓⅔]|\d\/\d)`;
// Units in the languages recipes commonly come in. `(?!\p{L})` instead of `\b`, which only knows ASCII.
const HOURS = String.raw`hours?|hrs?|h|час(?:а|ов)?|ч|годин(?:и|у)?|год|stunden?|std|heures?|horas?|ore|ora|uur|timm(?:e|ar)|tunti(?:a)?|godzin(?:y|ę|a)?|godz`;
const MINUTES = String.raw`minutes?|mins?|минут(?:а|ы|у)?|мин|хвилин(?:и|у)?|хв|minuten?|minutos?|minuti|minuto|minuut|minut(?:er|y|ę|a)?|minuutti(?:a)?`;
const SECONDS = String.raw`seconds?|secs?|секунд(?:а|ы|у)?|сек|sekunden?|secondes?|segundos?|secondi|seconden|sekund(?:er|y|ę|a)?|sekunti(?:a)?`;
const STEP_UNIT = String.raw`(${HOURS}|${MINUTES}|${SECONDS})(?!\p{L})`;
const AND = String.raw`(?:and|и|і|und|et|y|e|en|och|ja|i)`;
const STEP_DURATION = new RegExp(
  // "1 hour 30 minutes", "1 hr and 15 mins", "10-12 minutes", "1½ hours", "1 hour and a half", "1,5 часа"
  String.raw`(${NUM})(?:\s*(?:-|–|to|до)\s*(${NUM}))?\s*${STEP_UNIT}` +
    String.raw`(?:,?\s*(?:${AND}\s+)?(?:(${NUM})\s*${STEP_UNIT}|(a half)(?!\p{L})))?`,
  "giu",
);
// Russian/Ukrainian words with no digits: "полчаса", "полтора часа".
const WORD_DURATIONS: [RegExp, number][] = [
  [/полтора\s+час|півтори\s+годин/iu, 5400],
  [/полчаса|пів\s*години/iu, 1800],
];

const IS_HOURS = new RegExp(`^(?:${HOURS})$`, "iu");
const IS_MINUTES = new RegExp(`^(?:${MINUTES})$`, "iu");
function stepUnitSeconds(unit: string): number {
  if (IS_HOURS.test(unit)) return 3600;
  if (IS_MINUTES.test(unit)) return 60;
  return 1;
}

function parseNum(raw: string): number {
  const s = raw.trim().replace(",", ".");
  const frac = s.match(/(\d)\/(\d)$/);
  const uni = s.match(/[½¼¾⅓⅔]$/);
  const whole = Number(s.match(/^\d+(?:\.\d+)?(?=\s|[½¼¾⅓⅔]|$)/)?.[0] ?? 0);
  if (frac) return (s.includes(" ") ? whole : 0) + Number(frac[1]) / Number(frac[2]);
  if (uni) return whole + FRACTIONS[uni[0]];
  return Number(s);
}

/** Compact chip label: 5400 → "1 hr 30 min", 90 → "1 min 30 sec". */
export function formatShortDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  return [h && `${h} hr`, m && `${m} min`, s && `${s} sec`].filter(Boolean).join(" ") || "0 sec";
}

/** Find durations mentioned in a recipe step, for one-tap timer chips. */
export function findStepTimers(text: string): { label: string; seconds: number }[] {
  const found: number[] = [];
  for (const m of text.matchAll(STEP_DURATION)) {
    const [, from, to, unit, extraNum, extraUnit, andAHalf] = m;
    const base = stepUnitSeconds(unit);
    // For ranges like "10-12 minutes", use the upper bound.
    let seconds = parseNum(to ?? from) * base;
    if (extraNum && extraUnit) seconds += parseNum(extraNum) * stepUnitSeconds(extraUnit);
    if (andAHalf) seconds += base / 2;
    found.push(Math.round(seconds));
  }
  for (const [re, seconds] of WORD_DURATIONS) if (re.test(text)) found.push(seconds);
  return [...new Set(found.filter((s) => s > 0))].map((seconds) => ({ label: formatShortDuration(seconds), seconds }));
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export function speakDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} hour${h > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} minute${m > 1 ? "s" : ""}`);
  if (sec && !h) parts.push(`${sec} second${sec > 1 ? "s" : ""}`);
  return parts.join(" and ") || "less than a second";
}

export function formatMinutes(min?: number): string | undefined {
  if (!min) return undefined;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} hr${m ? ` ${m} min` : ""}` : `${m} min`;
}
