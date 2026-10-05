"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAccount } from "@/lib/account";
import { isSaved, PREMIUM_MAX, saveRecipe } from "@/lib/storage";
import { canOpenFree, recordOpen } from "@/lib/usage";
import type { Recipe } from "@/lib/types";

/** "allrecipes.com/…" or "https://…" — anything that should be imported rather than searched. */
export function looksLikeUrl(input: string) {
  const s = input.trim();
  return /^https?:\/\//i.test(s) || /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*/i.test(s);
}

/** Opening recipes from anywhere: built-ins, search results, or a pasted link. */
export function useOpenRecipe() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** We couldn't read the page, but the user can still copy the recipe text from it. */
  const [suggestPaste, setSuggestPaste] = useState(false);

  const { premium } = useAccount();

  /** Free users get a few new recipes a month; past that, send them to the paywall. */
  const allowed = useCallback(
    (recipe: Pick<Recipe, "id" | "sourceUrl">) => {
      if (premium || isSaved(recipe) || canOpenFree(recipe)) return true;
      router.push("/premium?reason=limit");
      return false;
    },
    [premium, router],
  );

  const open = useCallback(
    (recipe: Recipe) => {
      // Built-ins are always available; everything else is saved so it shows in "Recently cooked".
      if (recipe.origin !== "builtin") {
        if (!allowed(recipe)) return;
        if (!premium && !isSaved(recipe)) recordOpen(recipe);
        saveRecipe({ ...recipe, savedAt: Date.now() }, premium ? PREMIUM_MAX : undefined);
      }
      router.push(`/cook/${recipe.id}`);
    },
    [allowed, premium, router],
  );

  /** Resolves to a social post's caption when it was readable but not a whole recipe, for the user to finish. */
  const importLink = useCallback(
    async (input: string): Promise<string | undefined> => {
      const url = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
      // Check before fetching so we don't make them wait just to hit the paywall.
      if (!allowed({ id: "", sourceUrl: url })) return;
      setImporting(true);
      setError(null);
      setSuggestPaste(false);
      try {
        const res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = (await res.json()) as {
          recipe?: Omit<Recipe, "id" | "savedAt">;
          error?: string;
          suggestPaste?: boolean;
          /** Set when the site blocked us: the dish named in the link, to look up elsewhere. */
          dish?: string;
          /** A TikTok/Instagram/Facebook caption that's only part of a recipe. */
          text?: string;
        };
        if (data.dish) {
          const from = new URL(url).hostname.replace(/^www\./, "");
          router.push(`/search?q=${encodeURIComponent(data.dish)}&from=${encodeURIComponent(from)}`);
          setImporting(false);
          return;
        }
        if (!res.ok || !data.recipe) {
          setSuggestPaste(!!data.suggestPaste);
          setError(data.error ?? "Something went wrong.");
          setImporting(false);
          return data.text;
        }
        open({ ...data.recipe, id: crypto.randomUUID().slice(0, 8), savedAt: Date.now() });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setImporting(false);
      }
    },
    [allowed, open, router],
  );

  return { open, importLink, importing, error, setError, suggestPaste };
}
