"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, SearchIcon } from "@/components/icons";
import { RecipeCard } from "@/components/recipe-card";
import { SearchBar } from "@/components/search-bar";
import { looksLikeUrl, useOpenRecipe } from "@/hooks/use-open-recipe";
import { CATEGORIES, DEFAULT_RECIPES, searchDefaults } from "@/lib/default-recipes";
import type { Recipe } from "@/lib/types";

type Status = "idle" | "loading" | "done" | "error";

export function SearchView({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const { open, importLink, importing, error: importError, tryInBrowser } = useOpenRecipe();
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Recipe[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const latest = useRef(0);

  const run = useCallback(async (q: string) => {
    const id = ++latest.current;
    setStatus("loading");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { recipes?: Recipe[]; error?: string };
      if (id !== latest.current) return;
      if (!res.ok) throw new Error(data.error);
      setResults(data.recipes ?? []);
      setStatus("done");
    } catch {
      if (id === latest.current) setStatus("error");
    }
  }, []);

  // Sync from the URL (initial load and category taps) to the search.
  useEffect(() => {
    if (!query) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off a fetch for the current query
    run(query);
  }, [query, run]);

  function submit(value: string) {
    if (looksLikeUrl(value)) return importLink(value);
    setQuery(value);
    router.replace(`/search?q=${encodeURIComponent(value)}`, { scroll: false });
  }

  const local = query ? searchDefaults(query) : [];

  return (
    <main className="safe-bottom mx-auto min-h-dvh max-w-xl">
      <div className="safe-top sticky top-0 z-20 bg-ivory/90 px-4 pb-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Back" className="grid size-10 shrink-0 place-items-center rounded-full active:bg-oat">
            <ArrowLeftIcon />
          </Link>
          <div className="flex-1">
            <SearchBar value={input} onChange={setInput} onSubmit={submit} busy={importing} autoFocus={!initialQuery} />
          </div>
        </div>
        <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {CATEGORIES.map((c) => {
            const active = query.toLowerCase() === c.query;
            return (
              <button
                key={c.query}
                onClick={() => {
                  setInput(c.label);
                  submit(c.query);
                }}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
                  active ? "border-ink bg-ink text-ivory" : "border-line bg-card text-ink-soft active:bg-oat"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-4 pt-2">
        {importError && (
          <p role="alert" className="mb-4 rounded-2xl bg-clay-wash px-4 py-3 text-sm text-clay-deep">
            {importError}
            {tryInBrowser && (
              <>
                {" "}
                <Link href="/import" className="font-medium underline underline-offset-4">
                  Open it with the bookmark instead
                </Link>
              </>
            )}
          </p>
        )}

        {!query && (
          <Section title="Start with one of ours" hint="Works offline">
            <Grid recipes={DEFAULT_RECIPES} onOpen={open} />
          </Section>
        )}

        {query && local.length > 0 && (
          <Section title="From our kitchen" hint={`${local.length}`}>
            <Grid recipes={local} onOpen={open} />
          </Section>
        )}

        {query && (
          <Section
            title={local.length ? "More recipes" : `Recipes for “${query}”`}
            hint={status === "done" && results.length ? `${results.length}` : undefined}
          >
            {status === "loading" && <Skeleton />}
            {status === "error" && (
              <Empty
                title="Search is unavailable"
                body="Check your connection and try again. Our own recipes still work offline."
                action={<button onClick={() => run(query)} className="text-sm font-medium text-clay">Try again</button>}
              />
            )}
            {status === "done" && results.length === 0 && (
              <Empty
                title="Nothing found"
                body="Try a dish name (“lasagna”), an ingredient (“salmon”) or a cuisine (“Thai”). You can also paste a recipe link."
              />
            )}
            {status === "done" && results.length > 0 && <Grid recipes={results} onOpen={open} />}
          </Section>
        )}

        {query && status === "done" && results.length === 0 && local.length === 0 && (
          <Section title="Or try one of ours">
            <Grid recipes={DEFAULT_RECIPES.slice(0, 4)} onOpen={open} />
          </Section>
        )}
      </div>
    </main>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rise mt-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-serif text-[1.45rem] tracking-[-0.01em]">{title}</h2>
        {hint && <span className="text-xs text-muted tabular-nums">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Grid({ recipes, onOpen }: { recipes: Recipe[]; onOpen: (r: Recipe) => void }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} onOpen={onOpen} />
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5" aria-label="Loading recipes">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] rounded-3xl bg-oat" />
          <div className="mt-2.5 h-4 w-3/4 rounded-full bg-oat" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-oat" />
        </div>
      ))}
    </div>
  );
}

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-paper px-6 py-10 text-center">
      <SearchIcon className="text-muted" width={24} height={24} />
      <p className="mt-3 font-serif text-xl">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
