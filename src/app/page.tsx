"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRightIcon, ClockIcon, LinkIcon, ListIcon, MicIcon, SparkIcon, SunIcon } from "@/components/icons";
import { useRecipes } from "@/hooks/use-recipes";
import { removeRecipe, saveRecipe } from "@/lib/storage";
import type { Recipe } from "@/lib/types";
import { formatMinutes } from "@/lib/voice-commands";

export default function Home() {
  const router = useRouter();
  const { recipes } = useRecipes();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as { recipe?: Omit<Recipe, "id" | "savedAt">; error?: string };
      if (!res.ok || !data.recipe) throw new Error(data.error ?? "Something went wrong.");
      const recipe: Recipe = { ...data.recipe, id: crypto.randomUUID().slice(0, 8), savedAt: Date.now() };
      saveRecipe(recipe);
      router.push(`/cook/${recipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {}
  }

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-xl flex-col px-5">
      <header className="flex items-center gap-2 py-3">
        <SparkIcon className="text-clay" width={20} height={20} />
        <span className="font-serif text-[1.35rem] tracking-tight">Lemme Cook</span>
      </header>

      <section className="rise pt-10 pb-8">
        <h1 className="font-serif text-[2.75rem] leading-[1.05] tracking-[-0.02em] text-ink">
          What are we <em className="text-clay italic">cooking</em> today?
        </h1>
        <p className="mt-4 text-[1.05rem] leading-relaxed text-muted">
          Drop in any recipe link. We&apos;ll strip the life story and let you cook hands‑free, one step at a time.
        </p>
      </section>

      <form onSubmit={submit} className="rise" style={{ animationDelay: "80ms" }}>
        <div className="rounded-[1.75rem] border border-line bg-card p-2 shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_30px_-12px_rgba(20,20,19,0.12)] focus-within:border-clay/60">
          <label className="flex items-center gap-3 px-3 pt-2 pb-1">
            <LinkIcon className="shrink-0 text-muted" width={20} height={20} />
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Paste a recipe link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-12 w-full bg-transparent text-[1.05rem] text-ink outline-none placeholder:text-muted/80"
            />
          </label>
          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <button
              type="button"
              onClick={paste}
              className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft active:bg-oat"
            >
              Paste
            </button>
            <button
              type="submit"
              disabled={!url.trim() || loading}
              className="flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[0.95rem] font-medium text-ivory transition active:scale-[0.97] disabled:opacity-35"
            >
              {loading ? (
                <>
                  <span className="eq flex items-end gap-[3px]" aria-hidden>
                    <span /><span /><span /><span />
                  </span>
                  Reading recipe
                </>
              ) : (
                <>
                  Let&apos;s cook <ArrowRightIcon width={18} height={18} />
                </>
              )}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-2xl bg-clay-wash px-4 py-3 text-sm text-clay-deep">
            {error}
          </p>
        )}
      </form>

      <ul className="rise mt-8 grid grid-cols-3 gap-2" style={{ animationDelay: "160ms" }}>
        {[
          { icon: ListIcon, label: "Just the ingredients and steps" },
          { icon: MicIcon, label: "“Next”, “set a timer for 5 minutes”" },
          { icon: SunIcon, label: "Screen stays awake" },
        ].map(({ icon: Icon, label }) => (
          <li key={label} className="rounded-2xl bg-paper p-3.5">
            <Icon className="text-clay" width={20} height={20} />
            <p className="mt-2 text-[0.8rem] leading-snug text-ink-soft">{label}</p>
          </li>
        ))}
      </ul>

      {recipes.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-xs font-medium tracking-[0.12em] text-muted uppercase">Recently cooked</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
            {recipes.map((r) => (
              <li key={r.id} className="flex items-center">
                <Link href={`/cook/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-3 active:bg-paper">
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts
                    <img src={r.image} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-oat">
                      <SparkIcon className="text-clay" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-serif text-[1.1rem] leading-tight">{r.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted">
                      {r.siteName}
                      {formatMinutes(r.totalMinutes) && (
                        <>
                          <span aria-hidden>·</span>
                          <ClockIcon width={12} height={12} />
                          {formatMinutes(r.totalMinutes)}
                        </>
                      )}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => removeRecipe(r.id)}
                  aria-label={`Remove ${r.title}`}
                  className="mr-2 rounded-full px-3 py-2 text-xs text-muted active:bg-oat"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-auto pt-12 text-center text-xs text-muted">
        Works best in Chrome or Safari. Allow the microphone for voice control.
      </footer>
    </main>
  );
}
