"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightIcon, ListIcon, LockIcon } from "@/components/icons";
import { RecipeRow } from "@/components/recipe-card";
import { SearchBar } from "@/components/search-bar";
import { looksLikeUrl, useOpenRecipe } from "@/hooks/use-open-recipe";
import { useRecipes } from "@/hooks/use-recipes";
import { useAccount } from "@/lib/account";
import { CATEGORIES } from "@/lib/default-recipes";
import { looksLikeRoundup, parseRecipeText } from "@/lib/parse-text";
import { FREE_RECIPES_PER_MONTH } from "@/lib/plans";
import { removeRecipe } from "@/lib/storage";
import { useUsage } from "@/lib/usage";

/** A paste that's clearly a whole recipe rather than a search or link. */
function looksLikeRecipeText(text: string) {
  const t = text.trim();
  return t.includes("\n") && !looksLikeUrl(t);
}

export function HomeSearch() {
  const router = useRouter();
  const { recipes } = useRecipes();
  const account = useAccount();
  const used = useUsage();
  const { open, importLink, importing, error, setError, suggestPaste } = useOpenRecipe();
  const [query, setQuery] = useState("");
  const [textMode, setTextMode] = useState(false);
  const [text, setText] = useState("");

  async function submit(value: string) {
    if (!looksLikeUrl(value)) return router.push(`/search?q=${encodeURIComponent(value)}`);
    const caption = await importLink(value);
    if (caption) {
      setText(caption);
      setTextMode(true);
    }
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
    <>
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
                  account.premium ? (
                    <button
                      onClick={() => removeRecipe(r.id)}
                      aria-label={`Remove ${r.title}`}
                      className="mr-2 rounded-full px-3 py-2 text-xs text-muted active:bg-oat"
                    >
                      Remove
                    </button>
                  ) : (
                    // Free recipes are counted per month, so removing one wouldn't free up a slot anyway.
                    <Link
                      href="/premium?reason=remove"
                      aria-label={`Removing ${r.title} needs Premium`}
                      className="mr-2 flex items-center gap-1 rounded-full px-3 py-2 text-xs text-muted active:bg-oat"
                    >
                      <LockIcon width={12} height={12} /> Remove
                    </Link>
                  )
                }
              />
            ))}
          </ul>
        </section>
      )}

      {account.ready && !account.premium && used !== undefined && (
        <Link
          href="/premium"
          className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 text-sm active:bg-oat"
        >
          <span className="text-ink-soft">
            {used >= FREE_RECIPES_PER_MONTH
              ? "You've used this month's free recipes"
              : `${FREE_RECIPES_PER_MONTH - used} of ${FREE_RECIPES_PER_MONTH} free recipes left this month`}
          </span>
          <span className="shrink-0 font-medium text-clay">Go Premium</span>
        </Link>
      )}
    </>
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
