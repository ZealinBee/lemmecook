"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, SearchIcon } from "@/components/icons";
import { RecipeCard } from "@/components/recipe-card";
import { SearchBar } from "@/components/search-bar";
import { looksLikeUrl, useOpenRecipe } from "@/hooks/use-open-recipe";
import { CATEGORIES, DEFAULT_RECIPES } from "@/lib/default-recipes";
import type { Recipe } from "@/lib/types";

type Status = "idle" | "loading" | "done" | "error";

export function SearchView({ initialQuery, blockedSite }: { initialQuery: string; blockedSite?: string }) {
  const router = useRouter();
  const { open, importLink, importing, error: importError, suggestPaste } = useOpenRecipe();
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Recipe[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  /** We came here because this site refused a link; the query is the dish named in that link. */
  const [blocked, setBlocked] = useState(blockedSite);
  /** What the server actually searched for — a blocked link's slug gets whittled down to the dish. */
  const [matched, setMatched] = useState(initialQuery);
  const latest = useRef(0);
  const [web, setWeb] = useState<Recipe[]>([]);
  const [webStatus, setWebStatus] = useState<Status>("idle");
  const latestWeb = useRef(0);
  /** The server's guess when the query as typed found nothing ("mapotofu" → "mapo tofu"). */
  const [corrected, setCorrected] = useState<string>();

  const run = useCallback(async (q: string, loose: boolean) => {
    const id = ++latest.current;
    setStatus("loading");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}${loose ? "&loose" : ""}`);
      const data = (await res.json()) as { query?: string; recipes?: Recipe[]; error?: string };
      if (id !== latest.current) return;
      if (!res.ok) throw new Error(data.error);
      setMatched(data.query ?? q);
      if (loose && data.query) setInput(data.query);
      else if (data.query && data.query.trim().toLowerCase() !== q.trim().toLowerCase()) setCorrected(data.query);
      setResults(data.recipes ?? []);
      setStatus("done");
    } catch {
      if (id === latest.current) setStatus("error");
    }
  }, []);

  /** Recipe blogs, searched separately because it's slower than our recipe database. */
  const runWeb = useCallback(async (q: string) => {
    const id = ++latestWeb.current;
    setWebStatus("loading");
    try {
      const res = await fetch(`/api/search/web?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { query?: string; recipes?: Recipe[] };
      if (id !== latestWeb.current) return;
      if (!res.ok) throw new Error();
      if (data.query && data.query.trim().toLowerCase() !== q.trim().toLowerCase()) setCorrected(data.query);
      setWeb(data.recipes ?? []);
      setWebStatus("done");
    } catch {
      if (id === latestWeb.current) setWebStatus("error");
    }
  }, []);

  // A blocked link's slug has to be whittled down to the dish first; wait for that.
  const webQuery = blocked ? (status === "done" ? matched : "") : query;
  useEffect(() => {
    if (!webQuery) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off a fetch for the current query
    runWeb(webQuery);
  }, [webQuery, runWeb]);

  // Sync from the URL (initial load and category taps) to the search.
  useEffect(() => {
    if (!query) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off a fetch for the current query
    run(query, !!blocked);
  }, [query, blocked, run]);

  function submit(value: string) {
    if (looksLikeUrl(value)) return importLink(value);
    setBlocked(undefined);
    setCorrected(undefined);
    setQuery(value);
    router.replace(`/search?q=${encodeURIComponent(value)}`, { scroll: false });
  }

  const webPending = webStatus === "loading" || webStatus === "idle";
  const nothing = status === "done" && results.length === 0 && !webPending && web.length === 0;
  const searching = status === "loading" || (webPending && status !== "error");
  const found = [...(status === "done" ? results : []), ...(webPending ? [] : web)];

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
        {blocked && (
          <p className="mb-4 rounded-2xl bg-clay-wash px-4 py-3 text-sm text-clay-deep">
            {blocked} doesn&apos;t let apps read its recipes, so here are other versions of “{query}”. Or copy the
            recipe from the site and{" "}
            <Link href="/" className="font-medium underline underline-offset-4">
              paste it on the home screen
            </Link>
            .
          </p>
        )}

        {importError && (
          <p role="alert" className="mb-4 rounded-2xl bg-clay-wash px-4 py-3 text-sm text-clay-deep">
            {importError}
            {suggestPaste && (
              <>
                {" "}
                Copy the recipe text and{" "}
                <Link href="/" className="font-medium underline underline-offset-4">
                  paste it on the home screen
                </Link>
                .
              </>
            )}
          </p>
        )}

        {!query && (
          <Section title="Start with one of ours" hint="Works offline">
            <Grid recipes={DEFAULT_RECIPES} onOpen={open} />
          </Section>
        )}

        {corrected && found.length > 0 && (
          <p className="mt-2 text-sm text-muted">
            Showing results for <span className="font-medium text-ink">“{corrected}”</span>
          </p>
        )}

        {/* One list: our recipe database's matches first, then the web's. */}
        {query && (
          <Section title="From around the web" hint={found.length && !searching ? `${found.length}` : undefined}>
            {found.length > 0 && <Grid recipes={found} onOpen={open} />}
            {searching && <div className={found.length ? "mt-5" : ""}><Skeleton /></div>}
            {status === "error" && !searching && !found.length && (
              <Empty
                title="Search is unavailable"
                body="Check your connection and try again. Our own recipes still work offline."
                action={<button onClick={() => run(query, !!blocked)} className="text-sm font-medium text-clay">Try again</button>}
              />
            )}
            {nothing && (
              <Empty
                title="Nothing found"
                body="Try a dish name (“lasagna”), an ingredient (“salmon”) or a cuisine (“Thai”). You can also paste a recipe link."
              />
            )}
          </Section>
        )}

        {query && nothing && (
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
