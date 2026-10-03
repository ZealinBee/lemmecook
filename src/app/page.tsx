"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightIcon, ListIcon, MicIcon, SparkIcon, SunIcon, TimerIcon } from "@/components/icons";
import { RecipeCard, RecipeRow } from "@/components/recipe-card";
import { SearchBar } from "@/components/search-bar";
import { looksLikeUrl, useOpenRecipe } from "@/hooks/use-open-recipe";
import { useRecipes } from "@/hooks/use-recipes";
import { CATEGORIES, DEFAULT_RECIPES } from "@/lib/default-recipes";
import { looksLikeRoundup, parseRecipeText } from "@/lib/parse-text";
import { removeRecipe } from "@/lib/storage";

const QUICK = DEFAULT_RECIPES.filter((r) => (r.totalMinutes ?? 99) <= 20);

/** A paste that's clearly a whole recipe rather than a search or link. */
function looksLikeRecipeText(text: string) {
  const t = text.trim();
  return t.includes("\n") && !looksLikeUrl(t);
}

export default function Home() {
  const router = useRouter();
  const { recipes } = useRecipes();
  const { open, importLink, importing, error, setError, suggestPaste } = useOpenRecipe();
  const [query, setQuery] = useState("");
  const [textMode, setTextMode] = useState(false);
  const [text, setText] = useState("");

  function submit(value: string) {
    if (looksLikeUrl(value)) importLink(value);
    else router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  function handlePastedText(pasted: string) {
    if (!looksLikeRecipeText(pasted)) return false;
    setError(null);
    setText(pasted.trim());
    setTextMode(true);
    return true;
  }

  function cookText() {
    const parsed = parseRecipeText(text);
    if (!parsed) {
      return setError(
        looksLikeRoundup(text)
          ? "That's a list of recipes, not a recipe. Open the one you want and copy its ingredients and steps."
          : "Couldn't find a recipe in that text. Copy the part with the ingredients and steps.",
      );
    }
    open({ ...parsed, id: crypto.randomUUID().slice(0, 8), savedAt: Date.now() });
  }

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-center gap-2 px-5 py-3">
        <SparkIcon className="text-clay" width={20} height={20} />
        <span className="font-serif text-[1.35rem] tracking-tight">Lemme Cook</span>
      </header>

      <section className="rise px-5 pt-8 pb-6">
        <h1 className="font-serif text-[2.6rem] leading-[1.05] tracking-[-0.02em] text-ink">
          What are we <em className="text-clay italic">cooking</em> today?
        </h1>
        <p className="mt-3 text-[1.02rem] leading-relaxed text-muted">
          Search recipes, paste a link, or paste the recipe itself. Then cook hands‑free, one step at a time.
        </p>
      </section>

      <div className="rise px-5" style={{ animationDelay: "60ms" }}>
        {textMode ? (
          <div className="rounded-[1.75rem] border border-line bg-card p-2 shadow-[0_8px_30px_-12px_rgba(20,20,19,0.12)] focus-within:border-clay/60">
            <label className="flex gap-3 px-3 pt-3 pb-1">
              <ListIcon className="mt-0.5 shrink-0 text-muted" width={20} height={20} />
              <textarea
                autoFocus
                rows={8}
                placeholder={"Paste the whole recipe\n\nIngredients\n2 eggs\n…\n\nInstructions\n1. Whisk the eggs…"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="max-h-[50dvh] min-h-40 w-full resize-y bg-transparent text-[1rem] leading-relaxed text-ink outline-none placeholder:text-muted/80"
              />
            </label>
            <div className="flex items-center justify-between gap-2 px-1 pb-1">
              <button
                type="button"
                onClick={() => {
                  setTextMode(false);
                  setError(null);
                }}
                className="rounded-full px-3 py-2 text-sm text-muted active:bg-oat"
              >
                Search instead
              </button>
              <button
                onClick={cookText}
                disabled={!text.trim()}
                className="flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[0.95rem] font-medium text-ivory transition active:scale-[0.97] disabled:opacity-35"
              >
                Let&apos;s cook <ArrowRightIcon width={18} height={18} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={submit}
              busy={importing}
              onPasteText={handlePastedText}
            />
            <button
              onClick={() => setTextMode(true)}
              className="mt-2 ml-2 text-sm text-muted underline decoration-line underline-offset-4 active:text-ink"
            >
              Have the recipe text? Paste it instead
            </button>
          </>
        )}
        {error && (
          <div role="alert" className="mt-3 rounded-2xl bg-clay-wash px-4 py-3 text-sm text-clay-deep">
            <p>{error}</p>
            {suggestPaste && !textMode && (
              <p className="mt-2">
                Copy the recipe from the site and{" "}
                <button
                  onClick={() => {
                    setError(null);
                    setTextMode(true);
                  }}
                  className="font-medium underline underline-offset-4"
                >
                  paste it here
                </button>
                .
              </p>
            )}
          </div>
        )}
        <nav className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {CATEGORIES.map((c) => (
            <Link
              key={c.query}
              href={`/search?q=${c.query}`}
              className="shrink-0 rounded-full border border-line bg-card px-4 py-2 text-sm text-ink-soft active:bg-oat"
            >
              {c.label}
            </Link>
          ))}
        </nav>
      </div>

      {recipes.length > 0 && (
        <section className="mt-10 px-5">
          <SectionTitle>Recently cooked</SectionTitle>
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
            {recipes.slice(0, 5).map((r) => (
              <RecipeRow
                key={r.id}
                recipe={r}
                onOpen={() => router.push(`/cook/${r.id}`)}
                trailing={
                  <button
                    onClick={() => removeRecipe(r.id)}
                    aria-label={`Remove ${r.title}`}
                    className="mr-2 rounded-full px-3 py-2 text-xs text-muted active:bg-oat"
                  >
                    Remove
                  </button>
                }
              />
            ))}
          </ul>
        </section>
      )}

      <section className="rise mt-10" style={{ animationDelay: "120ms" }}>
        <div className="px-5">
          <SectionTitle hint="Works offline">From our kitchen</SectionTitle>
        </div>
        <div className="flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
          {DEFAULT_RECIPES.map((r) => (
            <RecipeCard key={r.id} recipe={r} onOpen={open} className="w-[42%] shrink-0 snap-start" />
          ))}
        </div>
      </section>

      <section className="mt-10 px-5">
        <SectionTitle>Dinner in 20 minutes</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {QUICK.slice(0, 4).map((r) => (
            <RecipeCard key={r.id} recipe={r} onOpen={open} />
          ))}
        </div>
      </section>

      <ul className="mt-12 grid grid-cols-3 gap-2 px-5">
        {[
          { icon: MicIcon, label: "Say “next” or “back”" },
          { icon: TimerIcon, label: "“Set a timer for 5 minutes”" },
          { icon: SunIcon, label: "Screen stays awake" },
        ].map(({ icon: Icon, label }) => (
          <li key={label} className="rounded-2xl bg-paper p-3.5">
            <Icon className="text-clay" width={20} height={20} />
            <p className="mt-2 text-[0.8rem] leading-snug text-ink-soft">{label}</p>
          </li>
        ))}
      </ul>

      <footer className="mt-auto px-5 pt-10 text-center text-xs text-muted">
        Search powered by TheMealDB. Allow the microphone for voice control.
      </footer>
    </main>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="font-serif text-[1.45rem] tracking-[-0.01em]">{children}</h2>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
