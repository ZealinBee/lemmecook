"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { saveRecipe } from "@/lib/storage";
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

  const open = useCallback(
    (recipe: Recipe) => {
      // Built-ins are always available; everything else is saved so it shows in "Recently cooked".
      if (recipe.origin !== "builtin") saveRecipe({ ...recipe, savedAt: Date.now() });
      router.push(`/cook/${recipe.id}`);
    },
    [router],
  );

  const importLink = useCallback(
    async (input: string) => {
      const url = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
      setImporting(true);
      setError(null);
      try {
        const res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = (await res.json()) as { recipe?: Omit<Recipe, "id" | "savedAt">; error?: string };
        if (!res.ok || !data.recipe) throw new Error(data.error ?? "Something went wrong.");
        open({ ...data.recipe, id: crypto.randomUUID().slice(0, 8), savedAt: Date.now() });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setImporting(false);
      }
    },
    [open],
  );

  return { open, importLink, importing, error, setError };
}
