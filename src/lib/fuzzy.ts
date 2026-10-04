import "server-only";

/**
 * Forgiving search: when a query finds nothing, guess what was meant —
 * run-together words ("mapotofu" → "mapo tofu") and typos ("lasgna" → "lasagna").
 * The vocabulary is TheMealDB's ingredients, cuisines and dish titles plus well-known dishes.
 */

const BASE = `https://www.themealdb.com/api/json/v1/${process.env.MEALDB_API_KEY || "1"}`;

/** Dishes and cooking words the recipe blogs know that TheMealDB's titles may not. */
const DISH_WORDS = `
mapo tofu ramen pho bibimbap bulgogi japchae kimchi jjigae tteokbokki gochujang katsu karaage teriyaki
yakitori yakisoba okonomiyaki gyoza onigiri miso udon soba tempura donburi oyakodon tonkatsu sukiyaki
shabu dumplings wonton dim sum bao char siu kung pao lo mein chow mein fried rice congee dan dan mapo
szechuan sichuan hoisin orange sesame general tso sweet sour egg roll spring roll pad thai see ew
khao tom yum kha green red curry massaman panang larb satay rendang laksa nasi goreng lemak adobo sinigang
lumpia pancit banh mi biryani tikka masala korma vindaloo butter chicken paneer saag palak dal dhal chana
aloo gobi samosa naan roti dosa idli sambar pulao pakora raita tandoori kofta shawarma falafel hummus
tabbouleh fattoush baba ganoush kebab kabob gyro souvlaki moussaka spanakopita tzatziki shakshuka
couscous tagine harissa jollof injera bobotie tacos taco burrito quesadilla enchiladas tamales pozole
carnitas birria barbacoa al pastor fajitas nachos guacamole salsa elote chilaquiles mole churros ceviche
empanadas arepas feijoada paella gazpacho tortilla patatas bravas risotto lasagna carbonara bolognese
alfredo pesto gnocchi ravioli tortellini fettuccine spaghetti penne rigatoni linguine orzo minestrone
cacciatore piccata marsala parmigiana parmesan caprese bruschetta focaccia tiramisu panna cotta cannoli
gelato pizza calzone ratatouille quiche crepes croissant bourguignon coq vin cassoulet souffle gratin
schnitzel sauerbraten spaetzle pierogi goulash borscht stroganoff blini pelmeni meatballs meatloaf
casserole chili cornbread mac cheese jambalaya gumbo etouffee brisket pulled pork ribs coleslaw biscuits
gravy pancakes waffles french toast omelette frittata granola muffins scones brownies cookies cupcakes
cheesecake banana bread pie cobbler crumble pudding fudge sandwich burger sliders hotdog wings nuggets
salad soup stew roast grilled baked fried braised steamed stir fry noodles rice beans lentils chickpeas
chicken beef pork lamb shrimp prawns salmon tuna cod tofu tempeh mushroom eggplant zucchini cauliflower
broccoli spinach potato potatoes sweet avocado tomato onion garlic ginger lemon lime coconut peanut
`;

const words = (s: string) => s.toLowerCase().match(/\p{L}+/gu) ?? [];

let vocabulary: Promise<Map<string, number>> | undefined;

async function list(path: string, field: string): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/${path}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
    const data = (await res.json()) as { meals: Record<string, string | null>[] | null };
    return (data.meals ?? []).map((m) => m[field] ?? "");
  } catch {
    return [];
  }
}

/** Word → how often it appears, so ties go to the commoner word. */
function getVocabulary() {
  vocabulary ??= (async () => {
    const sources = await Promise.all([
      list("list.php?i=list", "strIngredient"),
      list("list.php?a=list", "strArea"),
      list("list.php?c=list", "strCategory"),
      ...[..."abcdefghijklmnopqrstuvwxyz"].map((c) => list(`search.php?f=${c}`, "strMeal")),
    ]);
    const counts = new Map<string, number>();
    for (const w of [...words(DISH_WORDS), ...sources.flat().flatMap(words)]) {
      if (w.length >= 3) counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    return counts;
  })();
  return vocabulary;
}

/** Edit distance with transpositions ("lasgana" is one slip from "lasagna"). */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

function correct(word: string, vocab: Map<string, number>): string | undefined {
  const allowed = word.length <= 4 ? 1 : word.length <= 8 ? 2 : 3;
  let best: { w: string; d: number; n: number } | undefined;
  for (const [w, n] of vocab) {
    if (Math.abs(w.length - word.length) > allowed) continue;
    const d = distance(word, w);
    if (d <= allowed && (!best || d < best.d || (d === best.d && n > best.n))) best = { w, d, n };
  }
  return best?.w;
}

/** "chickencurry" → "chicken curry". Both halves known beats one known half with a plausible remainder. */
function split(word: string, vocab: Map<string, number>): string | undefined {
  let best: { s: string; score: number } | undefined;
  for (let i = 2; i <= word.length - 2; i++) {
    const [a, b] = [word.slice(0, i), word.slice(i)];
    const known = (vocab.has(a) ? a.length : 0) + (vocab.has(b) ? b.length : 0);
    const both = vocab.has(a) && vocab.has(b);
    if (!both && (known < 3 || Math.min(a.length, b.length) < 3)) continue;
    const score = (both ? 100 : 0) + known;
    if (!best || score > best.score) best = { s: `${a} ${b}`, score };
  }
  return best?.s;
}

/** A likelier spelling of the query, or undefined if every word already looks right. */
export async function fuzzyQuery(query: string): Promise<string | undefined> {
  const vocab = await getVocabulary();
  if (!vocab.size) return undefined;
  let changed = false;
  const fixed = words(query).map((w) => {
    if (w.length < 3 || vocab.has(w)) return w;
    const guess = split(w, vocab) ?? correct(w, vocab);
    if (guess) changed = true;
    return guess ?? w;
  });
  return changed ? fixed.join(" ") : undefined;
}
