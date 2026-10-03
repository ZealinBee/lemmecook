/** Rough language guess for recipe text, so read-aloud can pick a matching voice. Returns a BCP-47 base tag. */
export function detectLanguage(text: string): string {
  const count = (re: RegExp) => text.match(re)?.length ?? 0;
  const letters = count(/\p{L}/gu) || 1;
  const share = (re: RegExp) => count(re) / letters;

  if (share(/\p{Script=Cyrillic}/gu) > 0.3) return /[іїєґ]/i.test(text) ? "uk" : "ru";
  if (share(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu) > 0.05) return "ja";
  if (share(/\p{Script=Hangul}/gu) > 0.3) return "ko";
  if (share(/\p{Script=Han}/gu) > 0.3) return "zh";
  if (share(/\p{Script=Greek}/gu) > 0.3) return "el";
  if (share(/\p{Script=Hebrew}/gu) > 0.3) return "he";
  if (share(/\p{Script=Arabic}/gu) > 0.3) return "ar";
  if (share(/\p{Script=Thai}/gu) > 0.3) return "th";
  if (share(/\p{Script=Devanagari}/gu) > 0.3) return "hi";

  // Latin script: vote with common function words.
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  let best = "en";
  let bestHits = 0;
  for (const [lang, set] of Object.entries(STOPWORDS)) {
    const hits = words.filter((w) => set.has(w)).length;
    if (hits > bestHits) [best, bestHits] = [lang, hits];
  }
  return best;
}

const STOPWORDS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries({
    en: "the and with until into for add then minutes heat over of to",
    de: "und mit die der das bis den eine einen dann minuten zugeben im auf",
    fr: "et le la les avec des une dans pendant jusqu puis ajouter du au",
    es: "y el la los las con hasta una durante añadir del al en minutos",
    it: "e il la le con fino una per aggiungere del della nel minuti poi",
    pt: "e o a os as com até uma durante adicionar do da no em minutos",
    nl: "en de het met tot een in voeg toe minuten dan van op",
    pl: "i z w do na się minut dodać aż oraz",
    sv: "och med till en i minuter tills på av lägg",
    fi: "ja kunnes lisää minuuttia sekä noin tai kanssa",
  }).map(([lang, list]) => [lang, new Set(list.split(" "))]),
);

const STEP_WORDS: Record<string, [step: string, last: string]> = {
  en: ["Step", "Last step"],
  ru: ["Шаг", "Последний шаг"],
  uk: ["Крок", "Останній крок"],
  de: ["Schritt", "Letzter Schritt"],
  fr: ["Étape", "Dernière étape"],
  es: ["Paso", "Último paso"],
  it: ["Passo", "Ultimo passo"],
  pt: ["Passo", "Último passo"],
  nl: ["Stap", "Laatste stap"],
  pl: ["Krok", "Ostatni krok"],
  sv: ["Steg", "Sista steget"],
  fi: ["Vaihe", "Viimeinen vaihe"],
};

/** "Step 3." / "Шаг 3." — spoken in the recipe's language so the voice doesn't switch mid-sentence. */
export function stepPrefix(lang: string, index: number, last: boolean): string {
  const words = STEP_WORDS[lang];
  if (!words) return `${index + 1}.`;
  return last ? `${words[1]}.` : `${words[0]} ${index + 1}.`;
}
